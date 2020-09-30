const { Observable } = require('rxjs')
const fetch = require('node-fetch')
const postalCodes = require('./postal-codes')

const METHOD = 'API'
const BATCH_SIZE = 10
const LIMIT = 10000

module.exports = ({
  initFile,
  writeDataToFile,
  endFile,
  technologiesToScrape,
  MAST_DATABASE_BASE_URL
}) => {
  return new Observable(async observer => {
    observer.next('Starting...')

    for (let i = 0; i < technologiesToScrape.length; i++) {
      initFile(technologiesToScrape[i].name, METHOD)

      for (let j = 0; j < postalCodes.length; j += BATCH_SIZE) {
        const batch = postalCodes.slice(j, j + BATCH_SIZE)

        observer.next(`Scraping ${technologiesToScrape[i].name} postal codes between ${batch[0]}-${batch[batch.length - 1]}`)

        const results = await Promise.all(batch.map(postalCode => {
          return fetch(
              `${MAST_DATABASE_BASE_URL}.json?postnr=${postalCode}&teknologi=${technologiesToScrape[i].value}&maxantal=${LIMIT}`
          ).then(response => response.json())
        }))

        writeDataToFile(results.flat(), technologiesToScrape[i].name, METHOD)
      }

      endFile(technologiesToScrape[i].name, METHOD)
    }

    observer.complete()
  })
}
