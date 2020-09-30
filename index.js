const fs = require('fs')
const ora = require('ora')
const inquirer = require('inquirer')
const fetch = require('node-fetch')
const Listr = require('listr')
const apiScraper = require('./api-scraper')
const webScraper = require('./web-scraper')

const MAST_DATABASE_BASE_URL = 'https://mastedatabasen.dk'
const OUTPUT_DIRECTORY_PATH = './output'
const SCRAPING_METHODS = [
  'API',
  'Website'
]

async function main () {
  const loadingInitialOptionsSpinner = ora('Loading technologies, just a moment').start()
  const technologies = await getTechnologies()
  loadingInitialOptionsSpinner.stop()

  const scrapingMethodInquery = await inquirer.prompt([
    {
      name: 'answer',
      type: 'checkbox',
      choices: SCRAPING_METHODS,
      message: 'Which method should be used to scrape?'
    }
  ])
  const scrapingMethodsToUse = scrapingMethodInquery.answer

  const isScrapingMethodsSpecified = scrapingMethodsToUse.length !== 0
  if (!isScrapingMethodsSpecified) {
    console.log('❌ you need to specify one or more scraping methods')
    return
  }

  const technologyInquery = await inquirer.prompt([
    {
      name: 'answer',
      type: 'checkbox',
      choices: technologies,
      message: 'What technology/technologies should we scrape?'
    }
  ])

  const technologiesToScrape = technologies.filter(
    technology => technologyInquery.answer.includes(technology.value)
  )

  if (technologiesToScrape.length < 1) {
    console.log('❌ you need to specify one or more technologies to scrape')
    return
  }

  const isOutputCreationNeeded = !fs.existsSync(OUTPUT_DIRECTORY_PATH)
  if (isOutputCreationNeeded) fs.mkdirSync(OUTPUT_DIRECTORY_PATH)

  const tasks = []

  if (scrapingMethodsToUse.includes('API')) {
    tasks.push({
      title: 'API scraping',
      task: () => apiScraper({
        initFile,
        writeDataToFile,
        endFile,
        technologiesToScrape,
        MAST_DATABASE_BASE_URL
      })
    })
  }

  if (scrapingMethodsToUse.includes('Website')) {
    tasks.push({
      title: 'Web scraping',
      task: () => webScraper({
        initFile,
        writeDataToFile,
        endFile,
        technologiesToScrape,
        MAST_DATABASE_BASE_URL
      })
    })
  }

  const runner = new Listr(tasks, { concurrent: true })

  runner.run().catch(error => console.log(error))
}

async function getTechnologies () {
  const result = await fetch(`${MAST_DATABASE_BASE_URL}/Master/antenner/teknologier.json`)
    .then(response => response.json())
  return result.map(technology => {
    return {
      value: technology.id,
      name: (technology.navn).replace(/\s/g, '-')
    }
  })
}

function initFile (technologyName, method) {
  fs.writeFileSync(
    `${OUTPUT_DIRECTORY_PATH}/${technologyName}-${method}.json`,
    '[\n', 'utf-8'
  )
}

function writeDataToFile (data, technologyName, method) {
  data.forEach(item => {
    fs.appendFileSync(
      `${OUTPUT_DIRECTORY_PATH}/${technologyName}-${method}.json`,
      `  ${JSON.stringify(item)},\n`,
      'utf-8'
    )
  })
}

function endFile (technologyName, method) {
  fs.appendFileSync(
    `${OUTPUT_DIRECTORY_PATH}/${technologyName}-${method}.json`, ']\n',
    'utf-8'
  )
}

main()
