const { Observable } = require('rxjs')
const fetch = require('node-fetch')

const METHOD = 'API'
const LIMIT = 100000

function serviceTypeTranslation (serviceType) {
  if (serviceType === 'Andre') return 'other'
  if (serviceType === 'Mobiltelefoni') return 'mobile communication'
  if (serviceType === 'Teknologineutrale tilladelser') return 'neutral'
  return 'unknown'
}

function danishToEnglishMapping (item) {
  return {
    address: {
      city: item?.postnummer?.navn,
      postalCode: item?.postnummer?.nr,
      street: item?.vejnavn?.navn,
      number: item?.husnr
    },
    dateOfCommissioning: item?.idriftsaettelsesdato,
    plannedDateOfCommissioning: item?.forventet_idriftsaettelsesdato,
    etrs89Coordinates: {
      east: item?.etrs89koordinat?.oest,
      north: item?.etrs89koordinat?.nord
    },
    wgs84Coordinates: {
      latitude: item?.wgs84koordinat?.bredde,
      longitude: item?.wgs84koordinat?.laengde
    },
    serviceType: serviceTypeTranslation(item?.tjenesteart?.navn),
    technology: item?.teknologi,
    frequency: item?.frekvensbaand,
    radius: item?.radius_i_meter,
    uniqueStationName: item?.unik_station_navn
  }
}

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

      writeDataToFile(result.map(mast => danishToEnglishMapping(mast)), technologiesToScrape[i].name, METHOD)

      endFile(technologiesToScrape[i].name, METHOD)
    }

    observer.complete()
  })
}
