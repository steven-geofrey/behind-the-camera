# Interactive Timeline for Behind the Camera

This repository holds source and distribution code for the interactive timeline developed for the Behind the Camera project at University of British Columbia.

## Building the project

The assets for this project are compiled using Webpack. To build the project for hosting, use the command `npm run build`. The bundled project will be outputted to the folder `dist/`. This folder, and all of its contents, can be served as a bundled application, i.e., `dist/index.html`.

## Updating the data

The built project renders an interactive timeline application based on the following data:
* Biographical data about individual Japanese women photographers (e.g., birth and death year)
* Key events in the lives of individual photographers (e.g., major exhibitions)
* A selected bibliography for individual photographers (e.g., published monographs)
* Key hyperlinks for individual photographers (e.g., personal websites)
* Key events in Japanese history related to photography
* Key events in global history related to photography

The data for each of these sources are stored in Google Sheets at https://docs.google.com/spreadsheets/d/1qkPr9oV2O97swYs3dHKFa1mcXPptekmiTyjm44i0Q8A/edit?usp=sharing. Using Google Sheets makes it efficient for collaborators to update the data when necessary. In addition, Google Sheets makes it possible to preserve important style differences in the data, e.g., using proper italicization for sources cited in the selected bibliography.

However, the Google Sheets format is not valid for use by the timeline application. Instead, the timeline is rendered from data in CSV format. Therefore, when data are updated in the Google Sheets, these data must be transformed into the CSV format expected by the application.

This repository includes a utility function to assist with this process: `data-preparation/python-excel-to-html/convert-html-to-csv.py`. The following procedure may be used to update the data and rebuild the application when necessary.

1. **Download the Google Sheets workbook as an Excel Workbook.** Download all the sheets directly from Google Sheets in `.xlsx` format, i.e., **File > Download > Microsoft Excel (.xlsx)**
2. **Export each individual sheet in the workbook as separate files.** Open the downloaded Microsoft Excel workbook. For each sheet in the workbook, download the sheet as a web page, i.e., `.htm` format. Do this by going to **File > Save as... > Web Page (.htm)**. Export all sheets saved as `.htm` files in a subfolder inside `data-preparation/python-excel-to-html/data/{DATE OF UPDATE}/`. See an existing dated folder for an example. To be consistent with the file names expected by the utility function, name each `.htm` file for each sheet accordingly (italicized names are names of sheets in the workbook):
    *  *Women Photographers Timeline* -> save as `women-photographers-timeline.htm`
    *  *Individual Bio Timelines* -> save as `individual-bio-timeline.htm`
    *  *Selected Bibliography* -> save as `selected-bibliography.htm`
    *  *Photographer Hyperlinks* -> save as `photographer-hyperlinks.htm`
    *  *Global Photo History Timeline* -> save as `global-photo-history-timeline.htm`
    *  *Japan History Timeline* -> save as `japan-photo-history-timeline.htm`

3. **Run the Python utility script to convert the `.htm` files into `.csv` files.** Do the following:
     * In the utility script file `convert-html-to-csv.py`, update the `folderName` variable to point to the name of the folder created in Step 2. Notice that in the script, the path to each `.htm` file is stored in a separate variable. Make sure that these paths match the location of the stored `.htm` files in the folder.
     * Update the variables `outputFilePrefix` and `outputFolderName`. The script will turn the contents of each individual `.htm` file into a `.csv` file and prefix the output file name with the value of `outputFilePrefix`. All of the resulting `.csv` files will be placed in the folder `output-csv/{outputFolderName}`.
     * Run the script with `python convert-html-to-csv.py`. Use Python version 3+.
     * *Important Note*: The utility script converts values in each column of the spreadsheet into a CSV data structure by relying on the names of columns in the original sheets. If any of the column names in the spreadsheet change, the utility script may fail and will need to be updated to reflect any new column names.
  
4. **Update the source code for the application.** The codebase needs to be updated to reference the resulting `.csv` file names created in Step 3. In `src/modules/Data.js`, update the value of two variables:
      * `const folderName`: Change this value to the same value you used for `outputFolderName` in Step 3.
      * `const filePrefix`: Change this value to the same value you used for `outputFilePrefix` in Step 3.

5. **Rebuild the application.** Run `npm run build`.
6. **Copy the folder and `.csv` files from Step 3 into the output folder.** In `dist/data`, copy and paste the entire folder created in Step 3, including the `.csv` files inside. When the application is served, it will search for these files to render updated data.

## Questions?

The data update procedure for this application is minorly tedious due to the translation required between Google Sheets and CSV. If you have questions about the procedure or data structures, please contact Steven Geofrey at s.geofrey@fluidencodings.com.
