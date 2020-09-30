const { Observable } = require('rxjs')
const puppeteer = require('puppeteer')

const METHOD = 'WEB'

module.exports = ({
  initFile,
  writeDataToFile,
  endFile,
  technologiesToScrape,
  MAST_DATABASE_BASE_URL
}) => {
  return new Observable(async observer => {
    observer.next('Starting up browser...')

    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(MAST_DATABASE_BASE_URL, { waitUntil: 'domcontentloaded' })

    await page.waitForTimeout(2000)

    observer.next('Configuring standard settings on site...')

    await selectAllNetworkTypes(page)
    await selectExistingSites(page)
    await selectPlannedSites(page)

    // select list view before entering loop, because reasons...
    await page.waitForTimeout(1000)
    await selectListView(page)

    observer.next('Scraping started...')

    for (let i = 0; i < technologiesToScrape.length; i++) {
      await selectTechnology(page, technologiesToScrape[i].value)
      await page.waitForTimeout(1000)
      await clickShowButton(page)
      await page.waitForTimeout(5000)

      initFile(technologiesToScrape[i].name, METHOD)
      let pageNumber = 1
      let isAnotherPageAvailable = true

      while (isAnotherPageAvailable) {
        await page.waitForTimeout(1000)
        observer.next(`Scraping ${technologiesToScrape[i].name}, on page ${pageNumber}`)

        const data = await getData(page)
        const isDataValid = !!data
        if (!isDataValid) return

        writeDataToFile(data, technologiesToScrape[i].name, METHOD)

        pageNumber++
        isAnotherPageAvailable = await moveToNextPage(page, pageNumber)
      }
      endFile(technologiesToScrape[i].name, METHOD)
    }

    await browser.close()
    observer.complete()
  })
}

async function selectAllNetworkTypes (page) {
  await page.select('#filterDataView_select_1', '-1')
}

async function selectExistingSites (page) {
  await page.click('#filterlayercheck_box_0')
}

async function selectPlannedSites (page) {
  await page.click('#filterlayercheck_box_1')
}

async function selectTechnology (page, technologyValue) {
  await page.select('#sub_filterDataView_select_1', technologyValue)
  await page.waitForTimeout(5000)
}

async function selectListView (page) {
  await page.click('#__tab_ctl00_TabContentPlaceHolder_MapTapContainer1_TabContainer2_ListTabPanel')
}

async function clickShowButton (page) {
  await page.click('.FilterDataView_show_imagebutton')
}

async function getData (page) {
  const tableSelector = '#ctl00_TabContentPlaceHolder_MapTapContainer1_TabContainer2_ListTabPanel_MapFeaturesList1_GridView1'
  await page.waitForSelector(tableSelector)
  await page.waitForSelector('#ctl00_TabContentPlaceHolder_MapTapContainer1_TabContainer2_ListTabPanel_MapFeaturesList1_UpdateProgress1[style*="none"]')

  const isAnyMastsFound = !(await page.$('#ctl00_TabContentPlaceHolder_MapTapContainer1_TabContainer2_ListTabPanel_MapFeaturesList1_lIngenFundet'))
  if (!isAnyMastsFound) return

  const data = await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    const rows = Array.from(document.querySelectorAll('.GridViewRow,.GridViewAlternatingRow'))
    return rows.map(row => {
      const column = Array.from(row.querySelectorAll('td'))
      const isValidRow = column.length > 0
      if (!isValidRow) return {}
      return {
        operator: column[0].querySelector('img').title,
        street: column[2].innerText,
        postalCode: column[3].innerText,
        city: column[4].innerText,
        coordinates: column[5].innerText,
        technologyAndFrequency: column[6].innerText
      }
    })
  })

  return data
}

async function moveToNextPage (page, pageNumber) {
  const nextPageLink = await page.$(`a[href*='Page$${pageNumber}']`)
  if (!nextPageLink) return false
  await nextPageLink.click()
  await page.waitForTimeout(4000)
  return true
}
