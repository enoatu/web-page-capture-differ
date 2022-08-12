const puppeteer = require('puppeteer')
const fs = require('fs')
const argv = require('minimist')(process.argv.slice(2));
console.log(argv, process.argv)

const { logger } = require('./logger')

if (!argv._[0] || !argv._[1]) {
  logger.error(`arguments is invalid`)
  process.exit(1)
}

let browser = null
let launchCount = 0
let disconnectedCount = 0
let pagesCount = 0

// puppeteer(browser)の起動
const launch = async () => {
  launchCount++
  browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    ignoreHTTPSErrors: true,
    defaultViewport: {
      width: argv.w || argv.width || 800,
      height: argv.h || argv.height || 1200,
    },
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-background-networking',
      '--disable-gpu',
      '--disable-default-apps',
      '--no-zygote',
      '--disable-extensions',
      '--disable-sync',
      '--disable-translate',
      '--headless',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--ignore-certificate-errors-spki-list',
      '--user-data-dir=/tmp',
      '--remote-debugging-port=9222',
      '--remote-debugging-address=0.0.0.0',
    ]
  })

  logger.debug('launched puppeteer')
  logger.debug('puppeteer running PID: ' + browser.process().pid + ' ENDPOINT:' + browser.wsEndpoint())

  browser.on('disconnected', () => {
    logger.error(`puppeteer disconnected (count: ${++disconnectedCount}) try relaunch`)
    // コネクションが切れたら再起動
    launch()
  })
}

//  ブラウザのページを取得
const getPage = async () => {
  let page = null
  try {
    // 初回時に起動する
    !browser && await launch()

    const pages = await browser.pages()
    pagesCount = pages.length
    if (pagesCount > 5) {
      logger.error('Too many pages')
    }
    // 前のpageを閉じる
    await Promise.all(pages.map(async page => await page.close()))

    page = await browser.newPage()
  } catch (error) {
    logger.warn('failed new Page() try relaunch. error: ', error)
    browser && await browser.close()
    await launch()
    page = await getPage() // ループ
  }
  return page
}

const capture = async (url, name, index) => {
  logger.info(`starting capture${index}... ${url}`)

  const logPrefix = `capture`
  logger.debug(JSON.stringify({
    url,
    launchCount,
    disconnectedCount,
    pagesCount,
  }))

  let page = null
  let arrayBuffer = null;
  page = await getPage()
  page
    .on('pageerror', ({ message }) => {
      logger.warn(`${logPrefix} pageerror: ${message}`)
    })
    .on('requestfailed', request => logger.warn(`${logPrefix} requestfailed: ${request.failure().errorText} ${request.url()}`))
    .on('console', message => logger.debug(`${logPrefix} console: ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    .on('response', response => logger.debug(`${logPrefix} response: ${response.status()} ${response.url()}`))

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 })

  await page.waitForSelector('body', { timeout: 0 })
  const body = await page.$('body')
  // ブラウザ内処理
  await body.evaluate(() => {
    // 画像を待つように
    const images = document.querySelectorAll('img')
    const preLoad = () => {
      const promises = []
      const loadImage = img => {
        return new Promise((resolve) => {
          if (img.complete) {
            resolve(img)
          }
          img.onload = () => {
            resolve(img)
          }
          img.onerror = () => {
            resolve(img)
          }
        })
      }
      images.forEach(image => promises.push(loadImage(image)))
      return Promise.all(promises)
    }
    return preLoad()
  })
  // XXX: cssのcontentのアイコンを待つなど対応する

  const additionalWaitTime = Number(argv.additionalWaitTime) || 0
  additionalWaitTime && await page.waitFor(additionalWaitTime)

  // キャプチャ
  arrayBuffer = await page.screenshot({ fullPage: true })
  fs.writeFileSync(name, arrayBuffer, 'binary');
  logger.info(`finished capture${index}: ` + name.split('/').pop())
}

;(async () => {
  const dirPrefix     = argv.dirPrefix ?? ''
  const result1Dir    = `../result/${dirPrefix}1`
  const result2Dir    = `../result/${dirPrefix}2`
  const resultDiffDir = `../result/${dirPrefix}diff`
  // create dir IF NOT EXISTS
  ;[result1Dir, result2Dir, resultDiffDir].forEach(dir => {
    !fs.existsSync(dir) && fs.mkdirSync(dir);
  })

  const name1 = result1Dir + '/' + argv._[0].replaceAll(/[^a-zA-Z0-9]/ig, '_') + '.png'
  if (argv.captureIfNotExist1 && fs.existsSync(name1)) {
    logger.info('file1 is exist. Skip Capture')
  } else {
    await capture(argv._[0], name1, 1)
  }

  const name2 = result2Dir + '/' + argv._[1].replaceAll(/[^a-zA-Z0-9]/ig, '_') + '.png'
  if (argv.captureIfNotExist2 && fs.existsSync(name2)) {
    logger.info('file2 is exist. Skip Capture')
  } else {
    await capture(argv._[1], name2, 2)
  }

  const diffFilename = resultDiffDir + '/' + argv._[1].replaceAll(/[^a-zA-Z0-9]/ig, '_') + '.png'

  const { execSync } = require('child_process')
  try {
    execSync(`compare -metric AE ${name1} ${name2} ${diffFilename} 2>&1`)
    logger.info('[RESULT]: No diff')
    argv.outputOnlyDiff && fs.unlinkSync(diffFilename)
  } catch (e) {
    logger.debug(e)
    logger.warn('[RESULT]: Have diff')
  }

  process.exit()
})()
