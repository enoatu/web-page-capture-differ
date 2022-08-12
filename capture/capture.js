const puppeteer = require('puppeteer')
const fs = require('fs')
const argv = require('minimist')(process.argv.slice(2));
console.log(argv, process.argv)

const { logger } = require('./logger')

if (!argv._[0] || !argv._[1]) {
  logger.error(`arguments is invalid`)
  exit()
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

  logger.info('launched puppeteer')
  logger.info('puppeteer running PID: ' + browser.process().pid + ' ENDPOINT:' + browser.wsEndpoint())

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

const capture = async (url, name, existSkip) => {
  if (existSkip && fs.existsSync(name)) {
    return
  }
  const logPrefix = `capture`

  logger.info(JSON.stringify({
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
  logger.debug('waiting body')
  const body = await page.$('body')
  logger.debug('waiting 2500ms')
  await page.waitFor(1000)
  logger.debug('start waiting images')
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
  logger.debug('finish waiting images')
  // XXX: cssのcontentのアイコンを待つなど対応する
  await page.waitFor(1000)

  // キャプチャ
  arrayBuffer = await page.screenshot({ fullPage: true })
  fs.writeFileSync(name, arrayBuffer, 'binary');
  logger.debug('fs.writed: ' + name)
}

;(async () => {
  const dirPrefix = argv.dirPrefix ?? ''
  const name0 = dirPrefix + 'result1/' + argv._[0].replaceAll(/[^a-zA-Z0-9]/ig, '_') + '.png'
  await capture(argv._[0], name0, false)
  const name1 = dirPrefix + 'result2/' + argv._[1].replaceAll(/[^a-zA-Z0-9]/ig, '_') + '.png'
  await capture(argv._[1], name1, false)
  const name2 = dirPrefix + 'result-diff/' + argv._[1].replaceAll(/[^a-zA-Z0-9]/ig, '_') + '.png'

  logger.debug('prepared')
  const { execSync } = require('child_process')

  const stdout = execSync(`compare -metric AE ${name0} ${name1} ${name2}`)
  console.log(`stdout: ${stdout.toString()}`)
  process.exit()
})()
