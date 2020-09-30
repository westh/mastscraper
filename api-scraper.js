const { Observable } = require('rxjs')
const fetch = require('node-fetch')

const METHOD = 'API'
const LIMIT = 100000

module.exports = ({
  initFile,
  writeDataToFile,
  endFile,
  technologiesToScrape,
  MAST_DATABASE_BASE_URL
}) => {
  return new Observable(async observer => {
    observer.next('Scraping started...')

    for (let i = 0; i < technologiesToScrape.length; i++) {
      initFile(technologiesToScrape[i].name, METHOD)

      observer.next(`Scraping ${technologiesToScrape[i].name} all at once`)

      const result = await fetch(
          `${MAST_DATABASE_BASE_URL}/Master/antenner.json?` +
          `teknologi=${technologiesToScrape[i].value}&maxantal=${LIMIT}`
      ).then(response => response.json())

      writeDataToFile(result, technologiesToScrape[i].name, METHOD)

      endFile(technologiesToScrape[i].name, METHOD)
    }

    observer.complete()
  })
}
