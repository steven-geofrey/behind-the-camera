from bs4 import BeautifulSoup
import cssutils
import csv



# https://www.crummy.com/software/BeautifulSoup/bs4/doc
# https://pypi.org/project/cssutils/

folderName = "2022-09-05"
womenPhotographersTimeline = f"./data/{folderName}/women-photographers-timeline.htm"
individualBioTimeline = f"./data/{folderName}/individual-bio-timeline.htm"
selectedBibliography = f"./data/{folderName}/selected-bibliography.htm"
globalPhotoHistoryTimeline = f"./data/{folderName}/global-photo-history-timeline.htm"
japanPhotoHistoryTimeline = f"./data/{folderName}/japan-photo-history-timeline.htm"
photographerHyperlinks = f"./data/{folderName}/photographer-hyperlinks.htm"

sheetsAndColumns = [
    {
        "name": "womenPhotographersTimeline",
        "file": womenPhotographersTimeline,
        "columns": ["Name - romaji", "Name - kanji", "Birth date", "Active date", "Inactive date", "Death date", "Birth region", "Death region", "Bio", "Bio Preview"]
    },
    {
        "name": "individualBioTimeline",
        "file": individualBioTimeline,
        "columns": ["Name", "Year", "Event", "Image", "Image caption", "Display Year (if different)"]
    },
    {
        "name": "selectedBibliography",
        "file": selectedBibliography,
        "columns": ["Name", "Selected Bibliography", "Primary"]
    },
    {
        "name": "globalPhotoHistoryTimeline",
        "file": globalPhotoHistoryTimeline,
        "columns": ["Year", "Display Year (If different)", "Event", "Coding"]
    },
    {
        "name": "japanPhotoHistoryTimeline",
        "file": japanPhotoHistoryTimeline,
        "columns": ["Year", "Event", "Citation"]
    },
    {
        "name": "photographerHyperlinks",
        "file": photographerHyperlinks,
        "columns": ["Photographer Name", "URL of hyperlink", "Text of hyperlink - English", "Text of hyperlink - Japanese", "Type of hyperlink"]
    }
]

outputFolderName = "2022-09-05"
outputFilePrefix = "2022-09-05"

for sheet in sheetsAndColumns:
    sheetName = sheet["name"]
    sheetFile = sheet["file"]
    columnNames = sheet["columns"]
    print(f'Proceesing data for {sheetFile}...')
    with open(f'./output-csv/{outputFolderName}/{outputFilePrefix}_{sheetName}.csv', 'a+') as output:
        csvWriter = csv.DictWriter(output, columnNames)
        csvWriter.writeheader()

        with open(sheetFile) as page:
            soup = BeautifulSoup(page, 'html.parser')

            style = soup.style.contents[0]
            styleSheet = cssutils.parseString(style)
            italicClassNames = []
            for rule in styleSheet:
                if rule.type == rule.STYLE_RULE:
                    selector = rule.selectorText
                    if "font" in selector:
                        # Check to see if rule has font-style: italic
                        for property in rule.style:
                            if property.name == 'font-style' and property.value == 'italic':
                                italicClassNames.append(selector.replace(".", ""))

            
            # Now, iterate through all the rows in the table
            rows = soup.find_all("tr")
            rowCounter = 0
            for row in rows:
                rowCounter = rowCounter + 1

                # If it's the header row, skip
                if rowCounter == 1:
                    continue
                rowComponents = {}
                tdElements = row.find_all("td")
                
                # SUPER ANNOYING PROBLEM WE HAVE TO DEAL WITH:
                # When exporting xlsx to html, empty cells aren't
                # converted into independent <td> elements -- 
                # instead, adjacent empty cells are represented by a
                # single <td> with a colspan=2 or something else.
                # Below, we need to keep track of the cumulative offset
                # caused by these colspan cells to correctly map empty
                # values to the appropriate column name
                iOffset = 0

                for i, td in enumerate(tdElements):
                    actualIndex = i + iOffset
                    if actualIndex >= len(columnNames):
                        continue
                    formattedStringComponents = []
                    if len(td.contents) > 0:
                        for part in td.contents:
                            # In the next line, using .strings returns a list
                            # of individual string components; for more details, see:
                            # https://www.crummy.com/software/BeautifulSoup/bs4/doc/#strings-and-stripped-strings
                            stringContents = list(part.stripped_strings)
                            joinedStringContents = " ".join(stringContents)
                            if len(stringContents) == 0:
                                continue

                            if part.name == "font":
                                className = part["class"][0]
                                if className in italicClassNames:
                                    formattedStringComponents.append(f'<i>{joinedStringContents}</i>')
                                else:
                                    formattedStringComponents.append(joinedStringContents)
                            else:
                                formattedStringComponents.append(joinedStringContents)
                            
                    else:
                        formattedStringComponents.append("")
                    formattedString = " ".join(formattedStringComponents).replace("\n ", "").replace("\n", "")
                    formattedString = formattedString.strip()
                    rowComponents[columnNames[actualIndex]] = formattedString

                    if td.get("colspan"):
                        colspanOffset = int(td.get("colspan")) - 1
                        iOffset = iOffset + colspanOffset


                # If the row wasn't completely empty, write to file
                if bool(rowComponents):
                    csvWriter.writerow(rowComponents)
    print(f'File written')


