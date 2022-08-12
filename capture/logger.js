const log4js = require("log4js")

const logConfig = {
  appenders: {
    out: {
      type: 'stdout', // コンソールに出力
      layout: {
        type: 'pattern',
        pattern: null,
      }
    }
  },
  categories: {
    default: {
      appenders: ['out'],
      level: 'debug'
    }
  }
}

// [2017-03-30 07:57:00.113] [ERROR] のように表示させる
if (process.env.LOG_COLOR === 'true') { // 色をつけるかどうか
  logConfig.appenders.out.layout.pattern = '%[[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p] %c -%] %m'
} else {
  logConfig.appenders.out.layout.pattern = '[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p] %c -% %m'
}

log4js.configure(logConfig)

// prefixに capture という文字を入れる
const logger = log4js.getLogger('capture')

// envが指定されていなかったら、ログレベルを info に
logger.level = process.env.LOG_LEVEL || 'info'

// ログを確実に保存してexitする
const logSaveShutdown = () => {
  logger.warn('graceful log shutdown')
  log4js.shutdown(err => {
    if (err) throw err
    process.nextTick(() => process.exit(1))
  })
}

module.exports = { logger, logSaveShutdown }
