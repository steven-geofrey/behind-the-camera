import * as d3 from "d3";
import { codeValues } from "./Utils";

const clean = (d) => {
    return d.trim();
}

// The name of the subfolder holding the most current data files
const folderName = "2022-09-05";

// The file prefix for the most current data files
const filePrefix = "2022-09-05";


const promises = [
    // Global photography history timeline data
    d3.csv(`./data/${folderName}/${filePrefix}_globalPhotoHistoryTimeline.csv`, d => {
        if(d['Year'] === "" || d['Event'] === "") return;
        let eventCodes = [];
        for(let c in codeValues) {
            if(d["Coding"].includes(c)) eventCodes.push(c);
        }
        return {
            year: d['Year'] === "1826/7" ? 1826 : +d['Year'], // TEMPORARY PATCH FOR DATA
            displayYear: d['Display Year (If different)'],
            event: d['Event'],
            coding: eventCodes
        }
    }),
    // Japanese photography history timeline data
    d3.csv(`./data/${folderName}/${filePrefix}_japanPhotoHistoryTimeline.csv`, d => {
        if(d['YEAR'] === "" || d['Event'] === "") return;
        return {
            year: +d['Year'],
            displayYear: d['Year'],
            event: d['Event'],
            citation: d['Citation']
        }
    }),
    // Selected bibliography for photographers
    d3.csv(`./data/${folderName}/${filePrefix}_selectedBibliography.csv`, d => {
        if(d['Name'] === "") return;
        return {
            name: clean(d['Name']),
            bibliography: d['Selected Bibliography'],
            isPrimarySource: d['Primary'].toLowerCase() === "yes" ? true : false
        }

    }),
    // Biographical timelines for individual photographers (individual photographer events)
    d3.csv(`./data/${folderName}/${filePrefix}_individualBioTimeline.csv`, d => {
        if(d['Name'] === "") return;
        if(d['Event'] === "") return;
        return {
            name: clean(d['Name']),
            year: +d['Year'],
            displayYear: d['Display Year (if different)'] === "" ? +d['Year'] : d['Display Year (if different)'],
            event: d['Event'],
            image: d['Image'],
            caption: d['Image caption']
        }
    }),
    // Biographical data for all photographers
    d3.csv(`./data/${folderName}/${filePrefix}_womenPhotographersTimeline.csv`, d => {
        if(d['Name - romaji'] === "") return;

        let r = {
            romaji: clean(d['Name - romaji']),
            kanji: d['Name - kanji'],
            birthRegion: d['Birth region'],
            deathRegion: d['Death region'],
            bio: d['Bio'],
            bioPreview: d['Bio Preview'],
            link: d['Link'],
            image: ['Image'],
            caption: d['Image Caption']
        };

        let birth = d["Birth date"];
        let death = d["Death date"];
        let active = d["Active date"];
        let inactive = d["Inactive date"];

        if(birth.toLowerCase() === "unknown") {
            r.birth = "unknown";
        } else {
            r.birth = +d["Birth date"];
        }

        if(death.toLowerCase() === "unknown") {
            r.death = "unknown";
        } else if(death === "") {
            r.death = null;
        } else {
            r.death = +d["Death date"];
        }

        if(active.toLowerCase() === "unknown") {
            r.active = "unknown";
        } else if(active === "") {
            r.active = null;
        } else {
            r.active = +d["Active date"];
        }

        if(inactive.toLowerCase() === "unknown") {
            r.inactive = "unknown";
        } else if(inactive === "") {
            r.inactive = null;
        } else {
            r.inactive = +d["Inactive date"];
        }

        return r;

    }),
    // Hyperlinks for photographers
    d3.csv(`./data/${folderName}/${filePrefix}_photographerHyperlinks.csv`, d => {
        if(d['Photographer Name'] === "") return;
        return {
            name: clean(d['Photographer Name']),
            url: d['URL of hyperlink'],
            linkTextEnglish: d['Text of hyperlink - English'],
            linkTextJapanese: d['Text of hyperlink - Japanese'],
            linkType: d['Type of hyperlink'],
            isBtcResource: d['Type of hyperlink'] === "Behind the Camera" ? true : false
        }

    }),
];

export default promises;