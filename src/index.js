require("./style.css");
import * as d3 from "d3";
import { transition } from "d3";
import { sortPhotographerEvents } from "./modules/Utils";

const clean = function(d) {
    return d.trim();
}

const codeValues = {
    "T": {label: "Technology", className: "event--technology"},
    "P": {label: "Professional", className: "event--professional"},
    "I": {label: "Institutional", className: "event--institutional"},
    // "P": {label: "Professional (agencies, professional associations)", className: "event--professional"},
    // "I": {label: "Institutional (schools and museums)", className: "event--institutional"},
    "E/P": {label: "Exhibitions/Publications", className: "event--exhibition"}
};

const folderName = "2022-09-05";
const filePrefix = "2022-09-05";

const PROMISES = [
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
    d3.csv(`./data/${folderName}/${filePrefix}_japanPhotoHistoryTimeline.csv`, d => {
        if(d['YEAR'] === "" || d['Event'] === "") return;
        return {
            year: +d['Year'],
            displayYear: d['Year'],
            event: d['Event'],
            citation: d['Citation']
        }
    }),
    d3.csv(`./data/${folderName}/${filePrefix}_selectedBibliography.csv`, d => {
        if(d['Name'] === "") return;
        return {
            name: clean(d['Name']),
            bibliography: d['Selected Bibliography'],
            isPrimarySource: d['Primary'].toLowerCase() === "yes" ? true : false
        }

    }),
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

Promise.all(PROMISES).then(response => {


    let yearParse = d3.timeParse("%Y");


    const GLOBAL_TIMELINE = response[0],
        JAPAN_TIMELINE = response[1],
        PHOTOGRAPHER_BIBLIO = response[2],
        PHOTOGRAPHER_TIMELINE = response[3],
        PHOTOGRAPHERS = response[4].sort((a,b) => {
            let aValue = a.birth === "unknown" ? a.active : a.birth;
            let bValue = b.birth === "unknown" ? b.active : b.birth;
            return yearParse(aValue) - yearParse(bValue);
        }),
        PHOTOGRAPHER_HYPERLINKS = response[5];


    const WIDTH = document.querySelector("#chart").clientWidth;
    const MARGIN = {top: 40, left: 50, right: 50, bottom: 150};
    const transitionDuration = 250;
    const fadeOpacity = 0.3;
    const boxMarkerWidth = 12;
    // The width of the right-side timeline and individual photographer detail panel, in pixels
    const rightPanelWidth = 400;



    let svg = d3.select("#chart")
        .append("svg")
        .attr("width", WIDTH);

    // Add linear gradient def for individual photographer timelines
    let defs = svg.append("defs");
    let unknownGradient = defs.append("linearGradient")
            .attr("id", "unknownGradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%");

    unknownGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#CCCCCC")
        .attr("stop-opacity", 1);
    
    unknownGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#CCCCCC")
        .attr("stop-opacity", 0);
    




    // Handles for details container

    const timelineExpandContainer = d3.select("#timeline-expand--container");
    const detailsContainer = d3.select("#details--container");
    const chartControlsContainer = d3.select("#chart--controls");

    const details = {
        container: d3.select("#details"),
        romaji: d3.select("#details--romaji"),
        kanji: d3.select("#details--kanji"),
        // region: d3.select("#details--region"),
        lifetime: d3.select("#details--lifetime"),
        bio: d3.select("#details--bio"),
        btcResources: d3.select("#details--btc-resources"),
        events: d3.select("#details--events"),
        dataAttribution: d3.select("#details--data-attribution"),
        bibliography: d3.select("#details--biblio")
    };



    const TIMEPADDING = 10;
    // Manually setting start date for timeline --
    // will need to programmatically find minimum then
    // round to nearest decade
    let startDate = new Date(1800,0,1);
    let endDate = new Date(2022,0,1);

    const TIMESCALE = d3.scaleTime()
        .domain([
            // d3.timeParse("%Y")(d3.min(PHOTOGRAPHERS, p => p.birth === null ? null : +p.birth) - TIMEPADDING),
            startDate,
            // d3.timeParse("%Y")(d3.max(PHOTOGRAPHERS, p => p.death === null ? null : +p.death) + TIMEPADDING)
            endDate
        ]).range([MARGIN.left, WIDTH-MARGIN.right]);



    // UNIT_HEIGHT: The height of a single photographer timeline
    const UNIT_HEIGHT = 60;

    let plottingArea = svg.append("g")
        .attr("transform", `translate(0, 20)`);

    let selectedPhotographer;

    PHOTOGRAPHERS.forEach((photographer, i) => {


        let birth = yearParse(photographer.birth);
        let active = yearParse(photographer.active);
        let inactive = yearParse(photographer.inactive);
        let death = yearParse(photographer.death);

        // Determine which vital to use to position label
        let whichVital = birth || active || inactive || death;

        let stillLiving;
        let deathYear;
        // If photographer.death is null (empty), then photographer is still living
        if(photographer.death === null) {
            deathYear = "";
            stillLiving = true;
        } else {
            deathYear = photographer.death === "unknown" ? "d. unknown" : `d. ${photographer.death}`;
            stillLiving = false;
        }

        let g = plottingArea.append("g")
            .attr("class", "photographer--g")
            .datum({whichVital: whichVital, stillLiving: stillLiving, yPosition: UNIT_HEIGHT * i, detail: photographer})
            .attr("opacity", 1)
            .attr("transform", d => `translate(0, ${d.yPosition})`);

        // Draw dotted grid line
        g.append("line")
            .attr("class", "gridline--horizontal")
            .attr("x1", MARGIN.left)
            .attr("y1", 0)
            .attr("x2", WIDTH-MARGIN.right)
            .attr("y2", 0);

        if(birth && (death || inactive || active)) {
            let end = death || inactive || active;
            // Draw main axis line for photographer
            g.append("line")
                .attr("class", "photographer--axis")
                .attr("x1", TIMESCALE(birth))
                .attr("y1", 0)
                .attr("x2", TIMESCALE(end))
                .attr("y2", 0);

        }

        // If no known death, draw gradient line
        if(!death) {
            let start = inactive || active || birth;

            // g.append("path")
            //     .attr("d", `M${TIMESCALE(start)},0 l${30},0`)
            //     .attr("fill", "none")
            //     .attr("stroke", "url(#unknownGradient)")
            //     .attr("stroke-width", 5);

            // g.append("line")
            //     // .attr("class", "photographer--unknown")
            //     .attr("x1", TIMESCALE(start))
            //     .attr("y1", 0)
            //     .attr("x2", TIMESCALE(start) + 30)
            //     .attr("y2", 0)
            //     .attr("stroke", "url(#unknownGradient)")
            //     // .attr("stroke", "black")
            //     .attr("stroke-width", 20)

            // Weird buggy issue: cannot apply linearGradient to stroke of <line>
            // so using <rect> instead
            g.append("rect")
                .attr("class", "photographer--unknown")
                .attr("x", TIMESCALE(start))
                .attr("y", -2)
                .attr("width", 40)
                .attr("height", 6)
                .attr("fill", "url(#unknownGradient)")
                .attr("stroke","none");

            }

        // Draw line between active/inactive
        if(active && inactive) {
            g.append("line")
                .attr("class", "photographer--activeyears")
                .attr("x1", TIMESCALE(active))
                .attr("y1", 0)
                .attr("x2", TIMESCALE(inactive))
                .attr("y2", 0);
        }
    
        // Size of death square marker
        const formatTime = d3.timeFormat("%Y");

        let vitalsGroup = g.append("g")
            .attr("class", "vitals--g")
            .attr("opacity", 0);

        [birth, active, inactive, death].forEach(vital => {
            // If vital does not have value, don't draw anything
            if(!vital) return false;

            let className;
            switch(vital) {
                case birth:
                    className = "photographer--birth";
                    break;
                case death:
                    className = "photographer--death";
                    break;
                case active:
                    className = "photographer--active";
                    break;
                case inactive:
                    className = "photographer--inactive";
                    break;
                }


            if(vital === death) {

                g.append("rect")
                    .attr("class", className)
                    .attr("x", TIMESCALE(vital) - boxMarkerWidth / 2)
                    .attr("y", -boxMarkerWidth / 2)
                    .attr("width", boxMarkerWidth)
                    .attr("height", boxMarkerWidth);


            } else if(vital === birth) {

                g.append("path")
                    .attr("class", className)
                    .attr("d", d3.symbol(d3.symbolTriangle).size(110))
                    .attr("transform", `translate(${TIMESCALE(vital)},0)rotate(90)`);

            } else {
                // If the inactive end year and death year are the same,
                // don't draw a circle for inactive end year
                // Also, using the raw photographer.death/inactive properties because
                // `death` and `inactive` are JS Date objects
                if(!(vital === inactive && photographer.death === photographer.inactive)) {
                    
                    g.append("circle")
                        .attr("r", 8)
                        .attr("class", className)
                        .attr("cx", TIMESCALE(vital))
                        .attr("cy", 0);
                }

            }

            // Draw contrasting circle in foreground for precise reading
            g.append("circle")
            .attr("class", "marker--contrast")
            .attr("cx", TIMESCALE(vital))
            .attr("cy", 0)
            .attr("r", 2);

            let vitalLabel;
            if(vital === birth) {
                vitalLabel = "Born";
            } else if(vital === active) {
                vitalLabel = "Active";
            } else if(vital === inactive) {
                vitalLabel = "Inactive";
            } else if(vital === death) {
                vitalLabel = "Died";
            }

            const vitalLabelMargin = 20;
            // Add vital label
            if(vital === active) {
                if(active && inactive) {
                    vitalsGroup.append("text")
                        .attr("class", "vitals--label")
                        // .attr("transform", `translate(${TIMESCALE(vital)},0)rotate(-30)translate(-${TIMESCALE(vital)},0)`)
                        .attr("x", TIMESCALE(vital))
                        .attr("y", -vitalLabelMargin)
                        .text(`${vitalLabel} ${formatTime(active)} – ${formatTime(inactive)}`);

                } else if(stillLiving) {
                    vitalsGroup.append("text")
                        .attr("class", "vitals--label")
                        // .attr("transform", `translate(${TIMESCALE(vital)},0)rotate(-30)translate(-${TIMESCALE(vital)},0)`)
                        .attr("x", TIMESCALE(vital))
                        .attr("y", -vitalLabelMargin)
                        .text(`${vitalLabel} since ${formatTime(vital)}`);

                } else {
                    vitalsGroup.append("text")
                        .attr("class", "vitals--label")
                        // .attr("transform", `translate(${TIMESCALE(vital)},0)rotate(-30)translate(-${TIMESCALE(vital)},0)`)
                        .attr("x", TIMESCALE(vital))
                        .attr("y", -vitalLabelMargin)
                        .text(`${vitalLabel} from ${formatTime(vital)}`);

                }
            } else if(vital === birth || vital === death) {
                vitalsGroup.append("text")
                    .attr("class", "vitals--label")
                    // .attr("transform", `translate(${TIMESCALE(vital)},0)rotate(-30)translate(-${TIMESCALE(vital)},0)`)
                    .attr("x", TIMESCALE(vital))
                    .attr("y", vitalLabelMargin)
                    .text(`${vitalLabel} ${formatTime(vital)}`);

            }
        
        });

        // If photographer has individual timeline events, draw them
        let photographerEvents = PHOTOGRAPHER_TIMELINE.filter(pt => pt.name === photographer.romaji);
        // if(photographerEvents.length > 0) {
        //     let photographerEventMarkers = g.selectAll(".photographer--event")
        //         .data(photographerEvents)
        //         .join("line")
        //             .attr("class", "photographer--event")
        //             .attr("x1", pe => TIMESCALE(yearParse(pe.year)))
        //             .attr("y1", -12)
        //             .attr("x2", pe => TIMESCALE(yearParse(pe.year)))
        //             .attr("y2", 0)
        //             .attr("stroke", pe => {
        //                 let yp = yearParse(pe.year);
        //                 if(yp >= active && yp <= inactive) {
        //                     return "#F6C900";
        //                 } else {
        //                     return "#CCCCCC";
        //                 }
        //             })
        //             .lower();

        //     photographerEventMarkers.on("mouseover", function() {
        //         console.log("grouppppp",g.datum())
        //         mouseOver("individual", g, d3.select(this));
        //     }).on("mouseout", () => { mouseOut("individual"); })
        // }

        // Draw name label

        let nameLabel = g.append("g")
            .attr("class", "photographer-name--g")
            .attr("transform", d => `translate(${TIMESCALE(d.whichVital) - 10}, 0)`);

        let kanjiLabel = nameLabel.append("text")
            .attr("class", "photographer--name")
            .classed("name--kanji", true)
            .attr("x", 0)
            .attr("y", -8)
            .attr("dx", "-6pt")
            .text(photographer.kanji);

        let romajiLabel = nameLabel.append("text")
            .attr("class", "photographer--name")
            .classed("name--romaji", true)
            .attr("x", 0)
            .attr("y", 8)
            .attr("dx", "-6pt")
            .text(photographer.romaji);

        // Now draw rectangle behind group to capture mouseover
        let nameLabelBoundingRect = nameLabel.node().getBBox();
        let nameLabelRect = nameLabel.append("rect")
            .attr("class", "photographer--name-bounding-rect")
            .attr("x", nameLabelBoundingRect.x)
            .attr("y", nameLabelBoundingRect.y)
            .attr("width", nameLabelBoundingRect.width)
            .attr("height", nameLabelBoundingRect.height)
            .lower();


        // On label click, open details
        const transitionOffset = 30;
        nameLabelRect.on("mouseover", (e,d) => {


            if(freeSearchActive) return;

            timelinesTooltip.style("visibility", "hidden");

            if(d.detail.romaji === selectedPhotographer) return;

            let thisGroup = d3.selectAll(".photographer--g").filter(p => p.detail.romaji === d.detail.romaji);

            let regex = new RegExp(d.detail.romaji, 'i');

            nameLabel.selectAll("text")
                .classed("selected", true);

            let y = g.datum().yPosition;
            let x = TIMESCALE(d.whichVital) - 20;


            // if(x < WIDTH / 2) {
                // photographerTooltip.style("visibility", "visible")
                // .style("opacity", 0)
                // .style("top", `${y+transitionOffset}px`)
                // .style("left", `${x}px`)
                // .style("right", "unset")
                // .html(() => {
                //     let previewBio = photographer.bio.split(". ")[0];
                //     let previewBioWithBoldName = previewBio.replace(regex, `<b>${photographer.romaji}</b>`);
                //     return `<p>${previewBioWithBoldName}${previewBio.length > 1 ? "." : ""} <span class='see-more'>Click name to read more →</p>`;
                // });
            // } else {
            photographerTooltip.style("visibility", "visible")
                .style("opacity", 0)
                .style("top", `${y+transitionOffset}px`)
                .style("right", `${WIDTH - x + nameLabel.node().getBBox().width + 10}px`)
                .style("left", "unset")
                .html(() => {
                    let previewBio = d.detail.bioPreview;
                    let previewBioWithBoldName = previewBio.replace(regex, `<b>${d.detail.romaji}</b>`);
                    return `<p>${previewBioWithBoldName} <span class='see-more'>Click name to read more→</p>`;
                });

            // }

            
            photographerTooltip.transition()
                .duration(transitionDuration)
                .style("top", `${y}px`)
                .style("opacity", 1);

            d3.selectAll(".photographer--g")
                .transition()
                .duration(transitionDuration)
                .attr("opacity", fadeOpacity);

            d3.selectAll(".photographer--g").filter(p => p.detail.romaji === d.detail.romaji)
                .interrupt()
                .transition()
                .duration(transitionDuration)
                .attr("opacity", 1);

            // Make labels for vitals visible

            thisGroup.select(".vitals--g")
                .transition()
                .duration(transitionDuration)
                .attr("opacity", 1);

        }).on("mouseout", (e,d) => {

            if(freeSearchActive) return;
            if(d.detail.romaji === selectedPhotographer) return;

            nameLabel.selectAll("text")
                .classed("selected", false);

            photographerTooltip.style("visibility", "hidden");

            d3.selectAll(".photographer--g")
                .interrupt()
                .transition()
                .duration(transitionDuration)
                .attr("opacity", 1);

            d3.selectAll(".vitals--g")
                .transition()
                .duration(transitionDuration)
                .attr("opacity", 0);


        });


        nameLabelRect.on("click", (e,d) => {

            // Reset the general view
            resetView();

            // If timeline is opened, close it
            // timelineExpandContainer.style("visibility", "hidden");
            timelineExpandContainer.style("display", "none");
            timelinesTooltip.style("visibility", "hidden");
            d3.selectAll(".search-tooltip").remove();

            // Reset scroll position of container to top
            detailsContainer.node().scrollTop = 0;

            // Reset active free search
            freeSearchActive = false;

            selectedPhotographer = d.detail.romaji;
            
            svg.selectAll(".photographer-name--g text")
                .classed("selected", false);

            nameLabel.selectAll("text")
                .classed("selected", true);

            for(let handle in details) {

                let el = details[handle];

                if(handle === "romaji") el.html(d.detail.romaji);
                if(handle === "kanji") el.html(d.detail.kanji);
                // if(handle === "region" && photographer.region) el.html(photographer.region);
                if(handle === "lifetime") {
                    let birthYear = d.detail.birth === "unknown" ? "b. unknown" : `b. ${d.detail.birth}`;
                    let birthRegion = d.detail.birthRegion === "unknown" ? "unknown" : d.detail.birthRegion;
                    let deathRegion = d.detail.deathRegion === "unknown" ? "unknown" : d.detail.deathRegion;
                    if(stillLiving) {
                        let birthRegionDisplayValue;
                        if(birthRegion === "unknown" || birthRegion === "") {
                            birthRegionDisplayValue = "";
                        } else {
                            birthRegionDisplayValue = `(${birthRegion})`;
                        }

                        el.html([birthYear, birthRegionDisplayValue].join(" "));

                    } else {
                        let birthRegionDisplayValue, deathRegionDisplayValue;
                        if(birthRegion === "unknown" || birthRegion === "") {
                            birthRegionDisplayValue = "";
                        } else {
                            birthRegionDisplayValue = `(${birthRegion})`;
                        }

                        if(deathRegion === "unknown" || deathRegion === "") {
                            deathRegionDisplayValue = "";
                        } else {
                            deathRegionDisplayValue = `(${deathRegion})`;
                        }

                        const displayStringContents = [birthYear, birthRegionDisplayValue, "&ndash;", deathYear, deathRegionDisplayValue];
                        el.html(displayStringContents.join(" "));
                    }
                    // } else if(birthRegion === deathRegion && birthRegion !== "unknown") {
                    //     el.html(`${birthYear} &ndash; ${deathYear}<br>${deathRegion}`);
                    // } else if(birthRegion === "unknown" && deathRegion === "unknown") {
                    //     el.html(`${birthYear} &ndash; ${deathYear}`);
                    // } else if()
                    // } else {
                    //     el.html(`${birthYear} (${birthRegion}) &ndash; ${deathYear} (${deathRegion})`);
                    // }
                }
                if(handle === "bio") el.html(d.detail.bio);
                if(handle === "events") {
                
                    let orderedPhotographerEvents = sortPhotographerEvents(photographer, photographerEvents);

                    if(orderedPhotographerEvents.length > 0) {
                        let photographerActive = d.detail.active;
                        let photographerInactive = d.detail.inactive;

                        el.select("#events--container").selectAll("*").remove();
                        el.select("#events--container").selectAll(".event--row")
                            .data(orderedPhotographerEvents)
                            .join("div")
                                .attr("class", "event--row")
                                .classed("vital-row", k => k.eventType === "vital" ? true : false)
                                // Note: Rows that are in between active and inactive years are given class "active-row";
                                // however, "inactive" year may be undefined or "unknown", but still want the events after
                                // the active start year to have the same special .active-row class, so the following
                                // inline if statement checks for these conditions
                                .classed("active-row", k => k.eventType !== "vital" && (k.year >= photographerActive && k.year <= photographerInactive) || (photographerActive && (!photographerInactive || photographerInactive === "unknown") && k.year >= photographerActive) ? true : false)
                                .classed("special-row", k => k.eventClass === "active" || k.eventClass === "inactive" ? true : false)
                                .html(k => {

                                    if(k.eventType === "vital") {
                                        return `<div class='year'>${k.displayYear} ${k.event}</div>`;
                                    }
                                    /*
                                    For some timeline events, there are multiple events listed for the same year;
                                    these are separated by a semicolon (;), so here we will split those into separate rows
                                    */

                                    const splitEvents = k.event.split("; ");
                                    if(splitEvents.length == 1) {
                                        return `<div class='year'>${k.displayYear}</div><div class='event'><ul><li>${k.event}</li></ul></div>`;

                                    } else {
                                        let htmlContents = []
                                        splitEvents.forEach((s) => {
                                            // Make sure that first letter of each split event description is capitalized
                                            const eventString = s.trim();
                                            const formattedEventString = eventString.charAt(0).toUpperCase() + eventString.slice(1);
                                            htmlContents.push(`<li>${formattedEventString}</li>`);

                                        });

                                        return `<div class='year'>${k.displayYear}</div><div class='event'><ul>${htmlContents.join("")}</ul></div>`;

                                    }


                                });

                        el.style("display", "block");
                    } else {
                        el.style("display", "none");
                    }
                }

                if(handle === "dataAttribution") {
                    let match = PHOTOGRAPHER_BIBLIO.filter(p => p.name === d.detail.romaji && p.isPrimarySource);

                    if(match.length > 0) {
                        el.select("ul").selectAll("li").remove();
                        el.select("ul").selectAll("li")
                            .data(match)
                            .join("li")
                                .html(m => m.bibliography);

                        el.style("display", "block");
                    } else {
                        el.style("display", "none");
                    }

                }
                if(handle === "bibliography") {
                    let match = PHOTOGRAPHER_BIBLIO.filter(p => p.name === d.detail.romaji && p.bibliography !== "");

                    if(match.length > 0) {
                        el.select("ul").selectAll("li").remove();
                        el.select("ul").selectAll("li")
                            .data(match)
                            .join("li")
                                .html(m => m.bibliography);

                        el.style("display", "block");
                    } else {
                        el.style("display", "none");
                    }
                }
                if(handle === "btcResources") {
                    let match = PHOTOGRAPHER_HYPERLINKS.filter(p => p.name === d.detail.romaji && p.isBtcResource);

                    if(match.length > 0) {
                        el.select("ul").selectAll("li").remove();
                        el.select("ul").selectAll("li")
                            .data(match)
                            .join("li")
                                .html(m => `<a target='_blank' href='${m.url}'>${m.linkTextEnglish} ↗</a>`);

                        el.style("display", "block");
                    } else {
                        el.style("display", "none");
                    }

                }

    
            }

            // Now, make details container visible
            // detailsContainer.style("visibility", "visible");
            detailsContainer.style("display", "block");
            detailsContainer.transition()
                .duration(transitionDuration)
                .style("right", "0px");

            // And shift timeline container over
            d3.select("#chart--container")
                .transition()
                .duration(transitionDuration)
                .style("margin-left", "0px");

            // And make chart controls hidden
            chartControlsContainer.transition()
                .duration(transitionDuration)
                .style("margin-left", `-${rightPanelWidth}px`)
    
        });

        // Initialize details container with Shima Ryu for demonstration
        // if(photographer.romaji === selectedPhotographer) nameLabel.dispatch("click");


    });

    // Update height of visualization
    let bbox = plottingArea.node().getBBox();
    svg.attr("height", bbox.y + bbox.height + MARGIN.bottom);

    // Years for drawing gridlines and ticks
    let years = d3.timeYear.every(10).range(startDate, endDate);

    // Draw vertical gridlines
    svg.selectAll(".gridline--vertical")
        .data(years)
        .join("line")
            .attr("class","gridline--vertical")
            .attr("x1", y => TIMESCALE(y))
            .attr("y1", 0)
            .attr("x2", y => TIMESCALE(y))
            .attr("y2", svg.attr("height"))
            .lower();



    /* DRAWING TIMELINES */

    // Draw the main timeline axis
    let timelinesContainer = d3.select("#timelines")
        .append("svg")
        .attr("width", WIDTH);

    let axis = timelinesContainer.append("g")
        .attr("class", "timeline--axis")
        .attr("transform", `translate(0, ${MARGIN.top})`)
        .call(d3.axisTop().scale(TIMESCALE).tickValues(years));

    // Draw the timeline tooltip
    let timelinesTooltip = d3.select("#timelines")
        .append("div")
        .attr("class", "tooltip");


    // Draw the individual photographers tooltip
    let photographerTooltip = d3.select("#chart")
        .append("div")
        .attr("class", "preview-tooltip");

    const tooltipMargin = 10;

    const timelineHeight = 40;


    [GLOBAL_TIMELINE, JAPAN_TIMELINE].forEach((events, i) => {

        let y = MARGIN.top + (i + 1) * timelineHeight;
        let g = timelinesContainer.append("g")
            .datum({yPosition: y})
            .attr("transform", `translate(0, ${y})`);

        let label = g.append("text")
            .attr("class", "events--label")
            .attr("x", MARGIN.left)
            .attr("y", -15)
            .text(events === GLOBAL_TIMELINE ? "Global Events" : "Japan Events");

        let expandLabel = g.append("text")
            .attr("class", "expand--label")
            .attr("x", WIDTH - MARGIN.right)
            .attr("y", -15)
            .text("Expand →")

        let timelineAxis = g.append("line")
            .attr("class", "events--axis")
            .attr("x1", MARGIN.left)
            .attr("y1", 0)
            .attr("x2", WIDTH - MARGIN.right)
            .attr("y2", 0);

        // Draw markers for the events

        let markers = g.selectAll(".event--marker")
            .data(events)
            .join("line")
                .attr("class", "event--marker")
                .attr("x1", e => TIMESCALE(yearParse(e.year)))
                .attr("y1", -6)
                .attr("x2", e => TIMESCALE(yearParse(e.year)))
                .attr("y2", 6);

        markers.on("mouseover", function() { mouseOver("global", g, d3.select(this)); });

        timelineAxis.on("mousemove", (event) => {

            let position = d3.pointer(event)[0];
            let date = TIMESCALE.invert(position);
            let i = d3.bisectCenter(events.map(e => !yearParse(e.year) ? null : yearParse(e.year).getTime()), date.getTime());
            let el = g.selectAll(".event--marker").filter((em,j) => j == i);

            mouseOver("global", g, el);


        }).on("mouseout", () => { mouseOut("global"); });


        // Bind timeline expand option

        expandLabel.on("click", () => {

            // Reset scroll position of container to top
            timelineExpandContainer.node().scrollTop = 0;


            if(events === GLOBAL_TIMELINE) {
                d3.select("#filter--instructions").style("display", "block");
                d3.select("#timeline-expand--filters").style("display", "block");
            } else {
                d3.select("#timeline-expand--filters").style("display", "none");
                d3.select("#filter--instructions").style("display", "none");
            }

            timelineExpandContainer.select("#timeline-expand--events").selectAll("*").remove();

            timelineExpandContainer.select("#timeline-expand--header").html(events === GLOBAL_TIMELINE ? "Events in Global Photography" : "Events in Japanese Photography");


            timelineExpandContainer.select("#timeline-expand--events").selectAll(".event--row")
            .data(events)
            .join("div")
                .attr("class", "event--row")
                .html(k => {

                    if(events === GLOBAL_TIMELINE) {
                        let eventCodes = k.coding;

                        let spans = [];
                        eventCodes.forEach(ec => {
                            let v = codeValues[ec];
                            spans.push(`<span class='event--label ${v.className}'>${v.label}</span>`);
                        });

                        return `<div class='year'>${k.year} ${spans.join("")}</div><div class='event'><ul><li>${k.event}</li></ul></div>`;
        
                    } else {

                        return `<div class='year'>${k.year}</div><div class='event'><ul><li>${k.event}</li></ul></div>`

                    }
                });


            // Now, make timeline container visible
            // timelineExpandContainer.style("visibility", "visible");
            timelineExpandContainer.style("display", "block");
            timelineExpandContainer.transition()
                .duration(transitionDuration)
                .style("right", "0px");

            // And shift chart container
            d3.select("#chart--container")
                .transition()
                .duration(transitionDuration)
                .style("margin-left", "0px");

            // And make chart controls hidden
            chartControlsContainer.transition()
                .duration(transitionDuration)
                .style("margin-left", `-${rightPanelWidth}px`);

            resetView();

        });
    });

    d3.select("#timeline-expand--closebutton").on("click", () => {
        timelineExpandContainer.transition()
            .duration(transitionDuration)
            .style("right", `-${rightPanelWidth}px`)
            // .on("end", () => timelineExpandContainer.style("visibility", "hidden"));
            .on("end", () => timelineExpandContainer.style("display", "none"));

            // And shift chart container
            d3.select("#chart--container")
                .transition()
                .duration(transitionDuration)
                .style("margin-left", "0px");

            // And make chart controls hidden
            chartControlsContainer.transition()
                .duration(transitionDuration)
                .style("margin-left", "0px")

    });

    d3.select("#details-expand--closebutton").on("click", () => {
        detailsContainer.transition()
            .duration(transitionDuration)
            .style("right", `-${rightPanelWidth}px`)
            // .on("end", () => detailsContainer.style("visibility", "hidden"));
            .on("end", () => detailsContainer.style("display", "none"));

        chartControlsContainer.transition()
            .duration(transitionDuration)
            .style("margin-left", "0px");

        d3.select("#chart--container")
            .transition()
            .duration(transitionDuration)
            .style("margin-left", "0px");

        resetView();

    });

    let whichSelectedCategories = new Map();
    Object.keys(codeValues).forEach(k => whichSelectedCategories.set(k, true));

    d3.select("#timeline-expand--filters").selectAll(".event--label").on("click", function() {


        let dataset = d3.select(this).node().dataset;


        let value = dataset.value;
        if(whichSelectedCategories.get(value) == true) {
            whichSelectedCategories.set(value, false);
            d3.select(this).classed("deselected", true);
        } else {
            whichSelectedCategories.set(value, true);
            d3.select(this).classed("deselected", false);
        }

        
        timelineExpandContainer.selectAll(".event--row")
            .classed("event--hidden", k => {
                let display = false;
                k.coding.forEach(kc => {
                    if(whichSelectedCategories.get(kc) == true) display = true;
                });

                // If the event has at least 1 of any currently-selected categories,
                // then it should be displayed, and should NOT get the event--hidden class
                return !display;
            });

    });



    const resetView = () => {
        d3.selectAll(".photographer--g")
            .attr("opacity", 1);

        d3.selectAll("text")
            .classed("selected", false);

        d3.selectAll(".vitals--g")
            .attr("opacity", 0);

        selectedPhotographer = null;

        timelinesTooltip.style("visibility", "hidden");

        d3.selectAll(".search-tooltip").remove();

        // Free search reset
        freeSearchField.property("value", defaultSearchText);
        freeSearchClear.classed("invisible", true);
        freeSearchActive = false;

        // Timeline and details container scroll to top
        detailsContainer.node().scrollTop = 0;
        timelineExpandContainer.node().scrollTop = 0;

    };

    // Update height of SVG canvas for timelines
    timelinesContainer.attr("height", MARGIN.top + (3) * timelineHeight - 20);

    // Draw vertical gridlines
    timelinesContainer.selectAll(".gridline--vertical")
    .data(years)
    .join("line")
        .attr("class","gridline--vertical")
        .attr("x1", y => TIMESCALE(y))
        .attr("y1", 0)
        .attr("x2", y => TIMESCALE(y))
        .attr("y2", timelinesContainer.attr("height"))
        .lower();



    // Moving interactivity event handlers to bottom of script
    // so can use later-defined variables
    let mouseOver = (type, group, el) => {
        let d = el.datum();

        if(type === "global") {
        // mouseover event for global timeline 

            let tooltipX = TIMESCALE(yearParse(d.year));
            let tooltipY = group.datum()['yPosition'] + tooltipMargin;

            if(tooltipX > WIDTH/2) {
                timelinesTooltip.style("visibility", "visible")
                    .style("right", `${WIDTH - tooltipX}px`)
                    .style("left", "unset")
                    .style("top", `${tooltipY}px`);

            } else {
                timelinesTooltip.style("visibility", "visible")
                    .style("left", `${tooltipX}px`)
                    .style("right", "unset")
                    .style("top", `${tooltipY}px`);

            }

            // If it's a global event, include event coding in tooltip
            if("coding" in d) {
                let eventCodes = [];

                for(let c in codeValues) {
                    if(d["coding"].includes(c)) eventCodes.push(c);
                }

                let spans = [];
                eventCodes.forEach(ec => {
                    let v = codeValues[ec];
                    spans.push(`<span class='event--label ${v.className}'>${v.label}</span>`);
                });
                

                timelinesTooltip.html(`<h3 class='heading--year'>${d.displayYear} ${spans.join("")}</h3>${d.event}${d.citation ? "<br><br><i>Citation:</i> " + d.citation : ""}`);

            } else {
                timelinesTooltip.html(`<h3 class='heading--year'>${d.displayYear}</h3>${d.event}${d.citation ? "<br><br><i>Citation:</i> " + d.citation : ""}`);

            }

            group.selectAll(".event--marker").classed("event--highlight", false);
            // group.selectAll(".event--marker").filter((em,j) => j == i).classed("event--highlight", true);
            el.classed("event--highlight", true);
        
        } else if(type === "individual") {
        // mouseover event for individual photographer timeline

            photographerTooltip.style("visibility", "visible")
                .style("left", `${TIMESCALE(yearParse(d.year)) + tooltipMargin}px`)
                .style("top", `${+timelinesContainer.attr("height") + group.datum()['yPosition'] + tooltipMargin}px`);

            photographerTooltip.html(`<h3 class='heading--name'>${d.name}</h3><h4 class='heading--year'>${d.year}</h4><br>${d.event}`);

        }



    };

    let mouseOut = (type) => {

        if(type === "global") {
            timelinesContainer.selectAll(".event--marker").classed("event--highlight", false);
            timelinesTooltip.style("visibility", "hidden");
                
        } else if(type === "individual") {
            photographerTooltip.style("visibility", "hidden");

        }
    };

    svg.on("click", () => {
        photographerTooltip.style("visibility", "hidden");
        timelinesTooltip.style("visibility", "hidden");

    });

    /* CHART FILTERS */

    const labels = [
        ["birthRegion", "Birth place"],
        ["deathRegion", "Death place"],
        ["bio", "Biography"]
    ];

    const labelsMap = new Map(labels);

    // Free text search
    const defaultSearchText = "Type a word or phrase to search";
    const freeSearchField = d3.select("#search--freetext");
    const freeSearchClear = d3.select("#search--clear");
    let freeSearchActive = false;
    freeSearchField.property("value", defaultSearchText);
    freeSearchClear.classed("invisible", true);
    const searchFacets = ["birthRegion", "deathRegion", "bio"];
    freeSearchField.on("mousedown", function() {
        if(freeSearchField.property("value") === defaultSearchText) {
            freeSearchField.property("value", "");
        }
    });

    freeSearchField.on("input", function() {
        let inputValue = d3.select(this).property("value").toLowerCase();
        if(inputValue === "") {
            d3.selectAll(".search-tooltip").remove();
            d3.selectAll(".photographer--g").attr("opacity", 1);
            freeSearchClear.classed("invisible", true);    
            freeSearchActive = false;
            return;
        } else if(inputValue.length < 3) {
            freeSearchActive = false;
            return;
        }

        freeSearchClear.classed("invisible", false);
        freeSearchActive = true;

        let whatMatches = [];
        let nonMatches = [];
        let matches = d3.selectAll(".photographer--g")
            .filter((d, i, sel) => {
                let photographerDetail = d.detail;
                let match = false;
                searchFacets.forEach(s => {
                    let facetValue = photographerDetail[s];
                    if(facetValue.toLowerCase().indexOf(inputValue) >= 0) {
                        match = true;
                        whatMatches.push({name: photographerDetail.romaji, facet: s, value: facetValue});
                    }
                });
                if(!match) nonMatches.push(sel[i]);
                return match;
            });

            nonMatches.forEach(el => {
                d3.select(el)
                    // .transition()
                    // .duration(100)
                    .attr("opacity", fadeOpacity);
            });

            // d3.selectAll(".photographer--g").attr("opacity", 0);
        
            d3.selectAll(".search-tooltip").remove();

            let matchRegExp = new RegExp(`(${inputValue})`, "gi")
            matches.each(function(d, mi) {

                let tY = d.yPosition;
                d3.select(this)
                    // .attr("transform", `translate(0, ${tY})`)
                    .attr("opacity", 1);

                let searchTooltip = d3.select("#chart")
                    .append("div")
                    .attr("class", "search-tooltip");

                searchTooltip.on("mouseover", function() { d3.select(this).raise(); });

                /* BUG: When .datum() is used to assign different data to a parent and children elements,
                using selection.select() propagates the parent data to the child selection.
                To overcome this, need to use selection.selectAll(), which doesn't propagate data,
                and then select first element in the selection to retrieve the child datum.
                */
                let nameBBox = d3.select(this).select(".photographer-name--g").node().getBBox();
                let x = (TIMESCALE(d.whichVital) - 10) - nameBBox.width;
                let y = d.yPosition;


                searchTooltip.style("right", `${WIDTH-x}px`)
                    .style("top", `${tY}px`)
                    .html(() => {
                        let m = whatMatches.filter(wm => wm.name === d.detail.romaji);
                        let formatComponents = [];
                        m.forEach(mData => {
                            let formattedValue = mData.value.replace(matchRegExp, "<span class='search-result--match'>$1</span>");
                            if(mData.facet === "bio") {
                                // For bio matches, don't display whole bio search match -- just the term that matched
                                formattedValue = `<span class='search-result--match'>${mData.value.match(matchRegExp)}</span>`
                            }
                            formatComponents.push(`
                            <div class='search-result--row'>
                                <b>${labelsMap.get(mData.facet)}</b> ▸  ${formattedValue}
                            </div>
                            `);
                        });

                        return formatComponents.join("");
                    })
            });

        // Now scroll into view the first match
        // const chartContainerNode = d3.select("#chart--container").node();
        const timelinesContainerNodeHeight = timelinesContainer.node().getBoundingClientRect().height;
        // chartContainerNode.scrollTop = window.pageYOffset + matches.nodes()[0].getBoundingClientRect().top - timelinesContainerNodeHeight;

        window.scrollTo(0, window.pageYOffset + matches.nodes()[0].getBoundingClientRect().top - timelinesContainerNodeHeight);
    });

    // Clearing the free search field
    freeSearchClear.on("click", (e) => {
        e.stopPropagation();
        d3.selectAll(".search-tooltip").remove();
        d3.selectAll(".photographer--g").attr("opacity", 1);
        freeSearchClear.classed("invisible", true);
        freeSearchField.property("value", "");
        freeSearchField.node().focus();
    });

    // Reset search field is click outside input
    d3.select("body").on("click", (e) => {
        e.stopPropagation();
        if(e.target !== freeSearchField.node() && freeSearchField.property("value") === "") {
            freeSearchField.property("value", defaultSearchText);
            freeSearchClear.classed("invisible", true);
        }
    })

    /* DRAW THE LEGEND */
    const legendContainer = d3.select("#legend");
    const legendWidth = legendContainer.node().clientWidth;
    const legendHeight = legendContainer.node().clientHeight;
    const legendPadding = 20;
    const availableDrawingWidth = legendWidth - 2 * legendPadding;
    const legendSvg = legendContainer.append("svg")
        .attr("width", legendWidth)
        .attr("height", legendHeight);

    const legendG = legendSvg.append("g")
        .attr("transform", `translate(${legendPadding}, ${legendHeight/2})`);

    legendG.append("line")
        .attr("class", "photographer--axis")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", availableDrawingWidth)
        .attr("y2", 0);


    legendG.append("line")
        .attr("class", "photographer--activeyears")
        .attr("x1", availableDrawingWidth * 0.25)
        .attr("y1", 0)
        .attr("x2", availableDrawingWidth * 0.75)
        .attr("y2", 0);

    legendG.append("circle")
        .attr("r", 8)
        .attr("class", "photographer--active")
        .attr("cx", availableDrawingWidth * 0.25)
        .attr("cy", 0);

    legendG.append("circle")
        .attr("class", "marker--contrast")
        .attr("cx", availableDrawingWidth * 0.25)
        .attr("cy", 0)
        .attr("r", 2);

    legendG.append("circle")
        .attr("r", 8)
        .attr("class", "photographer--active")
        .attr("cx", availableDrawingWidth * 0.75)
        .attr("cy", 0);

    legendG.append("circle")
        .attr("class", "marker--contrast")
        .attr("cx", availableDrawingWidth * 0.75)
        .attr("cy", 0)
        .attr("r", 2);


    legendG.append("path")
        .attr("class", "photographer--birth")
        .attr("d", d3.symbol(d3.symbolTriangle).size(110))
        .attr("transform", `rotate(90)`);

    legendG.append("circle")
        .attr("class", "marker--contrast")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 2);


    legendG.append("rect")
        .attr("class", "photographer--death")
        .attr("x", availableDrawingWidth - boxMarkerWidth / 2)
        .attr("y", -boxMarkerWidth / 2)
        .attr("width", boxMarkerWidth)
        .attr("height", boxMarkerWidth);

    legendG.append("circle")
        .attr("class", "marker--contrast")
        .attr("cx", availableDrawingWidth)
        .attr("cy", 0)
        .attr("r", 2);

    // Now, labels

    const legendLabelMargin = 20;
    legendG.append("text")
        .attr("class", "legend--label")
        // .attr("transform", `translate(0,0)rotate(-30)translate(0,0)`)
        .attr("x", 0)
        .attr("y", -legendLabelMargin)
        .text("Birth");

    legendG.append("text")
        .attr("class", "legend--label")
        // .attr("transform", `translate(${availableDrawingWidth*0.25},0)rotate(-30)translate(${-availableDrawingWidth*0.25},0)`)
        .attr("x", availableDrawingWidth*0.25)
        .attr("y", -legendLabelMargin)
        .text("Active");

    legendG.append("text")
        .attr("class", "legend--label")
        // .attr("transform", `translate(${availableDrawingWidth*0.75},0)rotate(-30)translate(${-availableDrawingWidth*0.75},0)`)
        .attr("x", availableDrawingWidth*0.75)
        .attr("y", -legendLabelMargin)
        .text("Inactive");

    legendG.append("text")
        .attr("class", "legend--label")
        // .attr("transform", `translate(${availableDrawingWidth},0)rotate(-30)translate(${-availableDrawingWidth},0)`)
        .attr("x", availableDrawingWidth)
        .attr("y", -legendLabelMargin)
        .text("Death");

});