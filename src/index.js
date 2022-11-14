// require("./style.css");
import * as d3 from "d3";
import { sortPhotographerEvents, codeValues } from "./modules/Utils";
import PROMISES from "./modules/Data";

const stripExtraSpaceAfterParentheses = (input) => {
    // In some bibliographic data entries, there is an extra space
    // before and after parentheses, e.g.:
    // Tokuriki Sakuko,「婦人写真氏の実歴」( True Story of a Woman Photographer ), Fujin sekai 2:14 (1907): 30-33.
    // This function strips out the extra whitespace

    let stripped = input.replace("( ", "(").replace(" )", ")");
    return stripped;
}

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


    let WIDTH = document.querySelector("#chart").clientWidth;
    let WINDOW_WIDTH = window.innerWidth;
    let MARGIN = {top: 40, left: 50, right: 50, bottom: 150};
    const transitionDuration = 250;
    const fadeOpacity = 0.3;
    const boxMarkerWidth = 16;
    const triangleSymbolSize = 180;
    let detailsPanelIsVisible = false;
    const previewTooltipWidth = 300;

    // The width of the right-side timeline and individual photographer detail panel, in pixels
    let rightPanelWidth;
    let TIMESCALE;
    let timelinesContainer;


    const renderTimeline = () => {
        
        // Clear SVG container
        d3.select("#chart").selectAll("*").remove();
        d3.select("#timelines").selectAll("*").remove();

        if(WINDOW_WIDTH < 600) {
            rightPanelWidth = WIDTH;
            MARGIN = {top: 40, left: 75, right: 25, bottom: 150};
        } else if(WINDOW_WIDTH < 1024) {
            rightPanelWidth = 250;
            MARGIN = {top: 40, left: 50, right: 50, bottom: 150};
        } else {
            rightPanelWidth = 400;
            MARGIN = {top: 40, left: 50, right: 50, bottom: 150};
        }

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
        

        // Handles for details panel container
        const timelineExpandContainer = d3.select("#timeline-expand--container");
        const detailsContainer = d3.select("#details--container");
        const chartControlsContainer = d3.select("#chart--controls");

        // if(WIDTH < 600) {
        //     [timelineExpandContainer, detailsContainer].forEach(container => {
        //         container.on("touchmove", e => e.preventDefault());
        //     });
                
        // }

        // DOM element selections for details panel container elements
        const details = {
            container: d3.select("#details"),
            romaji: d3.select("#details--romaji"),
            kanji: d3.select("#details--kanji"),
            lifetime: d3.select("#details--lifetime"),
            bio: d3.select("#details--bio"),
            btcResources: d3.select("#details--btc-resources"),
            events: d3.select("#details--events"),
            dataAttribution: d3.select("#details--data-attribution"),
            bibliography: d3.select("#details--biblio")
        };


        // Manually setting start date for timeline --
        // will need to programmatically find minimum then
        // round to nearest decade
        let startDate = new Date(1800,0,1);
        let endDate = new Date(2024,0,1);

        TIMESCALE = d3.scaleTime()
            .domain([startDate, endDate]).range([MARGIN.left, WIDTH-MARGIN.right]);

        // UNIT_HEIGHT: The height of a single photographer timeline
        const UNIT_HEIGHT = 60;

        let plottingArea = svg.append("g")
            .attr("transform", `translate(0, 20)`);

        let selectedPhotographer;

        // Render timelines for each photographer
        // on the main group timeline SVG canvas
        PHOTOGRAPHERS.forEach((photographer, i) => {

            // Convert photographer's "vitals" year values into Date objects
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

            // Create <g> element for photographer
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

            // Draw main axis line for photographer between birth and death
            if(birth && (death || inactive || active)) {
                let end = death || inactive || active;
                g.append("line")
                    .attr("class", "photographer--axis")
                    .attr("x1", TIMESCALE(birth))
                    .attr("y1", 0)
                    .attr("x2", TIMESCALE(end))
                    .attr("y2", 0);

            }

            // If no known death or still living, draw gradient line
            // Weird buggy issue: cannot apply linearGradient to stroke of <line>
            // so using <rect> instead
            const deathYearUnknownDistance = 40;
            if(stillLiving) {
                let start = active || birth;

                g.append("rect")
                    .attr("class", "photographer--unknown")
                    .attr("x", TIMESCALE(start))
                    .attr("y", -5)
                    .attr("width", TIMESCALE(endDate) - TIMESCALE(start))
                    .attr("height", 10)
                    .attr("fill", "url(#unknownGradient)")
                    .attr("stroke","none");

            } else if(!death) {
                // This case is when the death year is unknown, but the photographer is not still living
                let start = inactive || active || birth;

                // Weird buggy issue: cannot apply linearGradient to stroke of <line>
                // so using <rect> instead
                g.append("rect")
                    .attr("class", "photographer--unknown")
                    .attr("x", TIMESCALE(start))
                    .attr("y", -5)
                    .attr("width", deathYearUnknownDistance)
                    .attr("height", 10)
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
            } else if(active && stillLiving) {
                // If photographer is still living, draw line from Active start year
                // to end date of timeline
                g.append("line")
                    .attr("class", "photographer--activeyears")
                    .attr("x1", TIMESCALE(active))
                    .attr("y1", 0)
                    .attr("x2", TIMESCALE(endDate))
                    .attr("y2", 0);

            }
        
            // Size of death square marker
            const formatTime = d3.timeFormat("%Y");

            let vitalsGroup = g.append("g")
                .attr("class", "vitals--g")
                .attr("opacity", 0);

            // Draw markers for vital events for photographer
            const vitalNames = ["birth", "active", "inactive", "death"];
            [birth, active, inactive, death].forEach((vital, vi) => {

                let vitalName = vitalNames[vi];
                // If vital does not have value, don't draw anything
                // Exception: we need to handle unknown death date as special cases
                if(!vital && vitalName !== "death") return false;

                const aliasEndDate = (vitalName === "death" && !stillLiving) ? (inactive || active || birth) : null;

                let className;
                switch(vitalName) {
                    case "birth":
                        className = "photographer--birth";
                        break;
                    case "death":
                        className = "photographer--death";
                        break;
                    case "active":
                        className = "photographer--active";
                        break;
                    case "inactive":
                        className = "photographer--inactive";
                        break;
                    }


                if(vitalName === "death") {

                    if(!death && !stillLiving) {
                        // Draw question marker symbol for unknown death year

                        g.append("rect")
                            .attr("class", className)
                            .attr("x", TIMESCALE(aliasEndDate) + deathYearUnknownDistance - boxMarkerWidth / 2)
                            .attr("y", -boxMarkerWidth / 2)
                            .attr("width", boxMarkerWidth)
                            .attr("height", boxMarkerWidth);

                        g.append("text")
                            .attr("class", "photographer--death-unknown")
                            .attr("x", TIMESCALE(aliasEndDate) + deathYearUnknownDistance)
                            .attr("y", 0)
                            .text("?");

                    } else if(death && !stillLiving) {
                        g.append("rect")
                            .attr("class", className)
                            .attr("x", TIMESCALE(vital) - boxMarkerWidth / 2)
                            .attr("y", -boxMarkerWidth / 2)
                            .attr("width", boxMarkerWidth)
                            .attr("height", boxMarkerWidth);

                    }


                } else if(vitalName === "birth") {

                    g.append("path")
                        .attr("class", className)
                        .attr("d", d3.symbol(d3.symbolTriangle).size(triangleSymbolSize))
                        .attr("transform", `translate(${TIMESCALE(vital)},0)rotate(90)`);

                } else {
                    // If the inactive end year and death year are the same,
                    // don't draw a circle for inactive end year
                    // Also, using the raw photographer.death/inactive properties because
                    // `death` and `inactive` are JS Date objects
                    if(!(vitalName === "inactive" && photographer.death === photographer.inactive)) {
                        
                        g.append("circle")
                            .attr("r", 10)
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

                // Add vital label for each marker
                let vitalLabel;
                if(vitalName === "birth") {
                    vitalLabel = "Born";
                } else if(vitalName === "active") {
                    vitalLabel = "Active";
                } else if(vitalName === "inactive") {
                    vitalLabel = "Inactive";
                } else if(vitalName === "death") {
                    vitalLabel = "Died";
                }

                const vitalLabelMargin = 20;
                if(vitalName === "active") {
                    if(active && inactive) {
                        vitalsGroup.append("text")
                            .attr("class", "vitals--label")
                            .attr("x", TIMESCALE(vital))
                            .attr("y", -vitalLabelMargin)
                            .text(`${vitalLabel} ${formatTime(active)} – ${formatTime(inactive)}`);

                    } else if(stillLiving) {
                        vitalsGroup.append("text")
                            .attr("class", "vitals--label")
                            .attr("x", TIMESCALE(vital))
                            .attr("y", -vitalLabelMargin)
                            .text(`${vitalLabel} since ${formatTime(vital)}`);

                    } else {
                        vitalsGroup.append("text")
                            .attr("class", "vitals--label")
                            .attr("x", TIMESCALE(vital))
                            .attr("y", -vitalLabelMargin)
                            .text(`${vitalLabel} from ${formatTime(vital)}`);

                    }                

                } else if(vitalName === "birth") {
                    vitalsGroup.append("text")
                        .attr("class", "vitals--label")
                        .attr("x", TIMESCALE(vital))
                        .attr("y", vitalLabelMargin)
                        .text(`${vitalLabel} ${formatTime(vital)}`);

                } else if(vitalName === "death") {
                    
                    if(!death && !stillLiving) {
                        // If death is unknown:

                        vitalsGroup.append("text")
                            .attr("class", "vitals--label")
                            .attr("x", TIMESCALE(aliasEndDate) + deathYearUnknownDistance)
                            .attr("y", vitalLabelMargin)
                            .text(`Death unknown`);

                    } else if(death && !stillLiving) {
                        let xPosition = TIMESCALE(vital);
                        let textAnchor;

                        // Slight adjustment for death year label so does not overflow past canvas
                        if(xPosition > WIDTH - 2*MARGIN.right) {
                            textAnchor = "middle";
                        } else {
                            textAnchor = "start";
                        }
                        vitalsGroup.append("text")
                            .attr("class", "vitals--label")
                            .attr("x", xPosition)
                            .attr("y", vitalLabelMargin)
                            .style("text-anchor", textAnchor)
                            .text(`${vitalLabel} ${formatTime(vital)}`);

                    }

                }
            
            });

            // If photographer has individual timeline events, draw them;
            // these event markers will only be visible when the photographer
            // has been selected
            let photographerEvents = PHOTOGRAPHER_TIMELINE.filter(pt => pt.name === photographer.romaji);
            if(photographerEvents.length > 0) {
                let photographerEventsMarkerContainer = g.append("g")
                    .attr("class", "photographer--event-container")
                    .classed("element--visible", false)
                    .attr("opacity", 0.8);

                let photographerEventMarkers = photographerEventsMarkerContainer.selectAll(".photographer--event")
                    .data(photographerEvents)
                    .join("circle")
                        .attr("class", "photographer--event")
                        .classed("photographer--event-active", pe => {
                            let yp = yearParse(pe.year);
                            if((yp >= active && stillLiving) || (yp >= active && yp <= inactive)) {
                                return true;
                            } else {
                                return false;
                            }
                        })
                        .attr("cx", pe => TIMESCALE(yearParse(pe.year)))
                        .attr("cy", 0)
                        .attr("r", 3);

                photographerEventMarkers.on("mouseover", function() {
                    mouseOver("individual", g, d3.select(this));
                }).on("mouseout", () => { mouseOut("individual"); })
            }

            // Draw name label for photographer
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


            // On photographer name label mouseover, update tooltip
            const transitionOffset = 30;

            let touchIsActive = false;
            nameLabelRect.on("touchstart", () => {
                touchIsActive = true;
            }).on("touchend", () => {
                touchIsActive = false;
            });

            nameLabelRect.on("mouseover", (e,d) => {

                if(touchIsActive) return;
                if(freeSearchActive) return;
                if(d.detail.romaji === selectedPhotographer) return;

                timelinesTooltip.style("visibility", "hidden");

                let thisGroup = d3.selectAll(".photographer--g").filter(p => p.detail.romaji === d.detail.romaji);

                let regex = new RegExp(d.detail.romaji, 'i');

                nameLabel.selectAll("text")
                    .classed("selected", true);

                let y = g.datum().yPosition;
                let x = TIMESCALE(d.whichVital) - 20;

                // Update tooltip with photographer bio preview

                if(x < (previewTooltipWidth * 1.1) && detailsPanelIsVisible) {
                    photographerTooltip
                        .style("left", `${x + 10}px`)
                        .style("right", "unset");
                } else {

                    photographerTooltip
                        .style("right", `${WIDTH - x + nameLabel.node().getBBox().width + 10}px`)
                        .style("left", "unset");

                }
                photographerTooltip.style("visibility", "visible")
                    .style("opacity", 0)
                    .style("top", `${y+transitionOffset}px`)
                    .html(() => {
                        let previewBio = d.detail.bioPreview;
                        let previewBioWithBoldName = previewBio.replace(regex, `<b>${d.detail.romaji}</b>`);
                        return `<p>${previewBioWithBoldName} <span class='see-more'>Click name to read more→</p>`;
                    });
                
                photographerTooltip.transition()
                    .duration(transitionDuration)
                    .style("top", `${y}px`)
                    .style("opacity", 1);

                // Fade out all photographer timelines
                d3.selectAll(".photographer--g")
                    .transition()
                    .duration(transitionDuration)
                    .attr("opacity", fadeOpacity);

                // Fade in the selected photographer timeline
                d3.selectAll(".photographer--g").filter(p => p.detail.romaji === d.detail.romaji)
                    .interrupt()
                    .transition()
                    .duration(transitionDuration)
                    .attr("opacity", 1);

                // Make labels for vitals visible for this photographer
                thisGroup.select(".vitals--g")
                    .transition()
                    .duration(transitionDuration)
                    .attr("opacity", 1);

            }).on("mouseout", (e,d) => {

                if(freeSearchActive) return;
                if(d.detail.romaji === selectedPhotographer) return;

                let thisGroup = d3.selectAll(".photographer--g").filter(p => p.detail.romaji === d.detail.romaji);

                nameLabel.selectAll("text")
                    .classed("selected", false);

                photographerTooltip.style("visibility", "hidden");

                d3.selectAll(".photographer--g")
                    .interrupt()
                    .transition()
                    .duration(transitionDuration)
                    .attr("opacity", 1);

                
                thisGroup.selectAll(".vitals--g")
                    .transition()
                    .duration(transitionDuration)
                    .attr("opacity", 0);


            });


            // When click on photographer name label, open and populate
            // photographer details panel
            nameLabelRect.on("click", (e,d) => {

                // Reset the general view
                resetView();

                // Retrieve parent group element
                let thisGroup = d3.selectAll(".photographer--g").filter(p => p.detail.romaji === d.detail.romaji);

                // If timeline is opened, close it
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

                // Populate the details panel elements with
                // data about this photographer
                for(let handle in details) {

                    let el = details[handle];

                    if(handle === "romaji") el.html(d.detail.romaji);
                    if(handle === "kanji") el.html(d.detail.kanji);
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
                                    .classed("active-row", k => k.eventType !== "vital" && ((k.year >= photographerActive && k.year <= photographerInactive) || (photographerActive && (!photographerInactive || photographerInactive === "unknown") && k.year >= photographerActive)) ? true : false)
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
                                            return `<div class='year'>${k.displayYear}</div><div class='event'><ul><li>${stripExtraSpaceAfterParentheses(k.event)}</li></ul></div>`;

                                        } else {
                                            let htmlContents = []
                                            splitEvents.forEach((s) => {
                                                // Make sure that first letter of each split event description is capitalized
                                                const eventString = s.trim();
                                                const formattedEventString = eventString.charAt(0).toUpperCase() + eventString.slice(1);
                                                htmlContents.push(`<li>${stripExtraSpaceAfterParentheses(formattedEventString)}</li>`);

                                            });

                                            return `<div class='year'>${k.displayYear}</div><div class='event'><ul>${htmlContents.join("")}</ul></div>`;

                                        }


                                    });

                            el.style("display", "block");
                        } else {
                            el.style("display", "none");
                        }

                        // Make event markers on individual timeline visible
                        thisGroup.select(".photographer--event-container").classed("element--visible", true);
                    }

                    if(handle === "dataAttribution") {
                        let match = PHOTOGRAPHER_BIBLIO.filter(p => p.name === d.detail.romaji && p.isPrimarySource);

                        if(match.length > 0) {
                            el.select("ul").selectAll("li").remove();
                            el.select("ul").selectAll("li")
                                .data(match)
                                .join("li")
                                    .html(m => stripExtraSpaceAfterParentheses(m.bibliography));

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
                                    .html(m => stripExtraSpaceAfterParentheses(m.bibliography));

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
                                    .html(m => `<a target='_blank' href='${m.url}'>${m.linkTextEnglish}</a>`);

                            el.style("display", "block");
                        } else {
                            el.style("display", "none");
                        }

                    }

        
                }

                // Now, make details container visible
                detailsContainer.style("display", "block");
                detailsContainer.transition()
                    .duration(transitionDuration)
                    .style("right", "0px");

                detailsPanelIsVisible = true;

                // Make photographer's vital labels visible
                thisGroup.select(".vitals--g")
                    .attr("opacity", 1);

                // And shift timeline container over
                d3.select("#chart--container")
                    .transition()
                    .duration(transitionDuration)
                    .style("margin-left", "0px");

                // And make chart controls hidden
                chartControlsContainer.transition()
                    .duration(transitionDuration)
                    .style("margin-left", `-${rightPanelWidth}px`);
        
            });

        });

        // Update height of visualization
        let bbox = plottingArea.node().getBBox();
        svg.attr("height", bbox.y + bbox.height + MARGIN.bottom);

        // Years for drawing gridlines and ticks
        let years;

        if(WINDOW_WIDTH < 1024) {
            // When screen width is smaller, reduce number of ticks drawn
            // to every 50 years
            years = d3.timeYear.every(50).range(startDate, endDate);
        } else {
            // Otherwise, tick marks every 10 years
            years = d3.timeYear.every(10).range(startDate, endDate);
        }

        
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


        /* DRAWING TOP HORIZONTAL TIMELINES */

        // Draw the main timeline axis
        timelinesContainer = d3.select("#timelines")
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
            .attr("class", "photographer-event-tooltip");

        const tooltipMargin = 10;
        const timelineHeight = 40;

        // Draw the global and Japanese photography history timelines
        // and event markers
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


            // When click on "Expand->" button, open the timeline details panel
            expandLabel.on("click", () => {

                // Close individual photographer details panel, if open
                detailsContainer.style("display", "none");
                detailsPanelIsVisible = false;
                timelinesTooltip.style("visibility", "hidden");
                d3.selectAll(".search-tooltip").remove();

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


                // Populate the timeline details panel with events for this timeline
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

        // Close the timeline details panel
        d3.select("#timeline-expand--closebutton").on("click", () => {
            timelineExpandContainer.transition()
                .duration(transitionDuration)
                .style("right", `-${rightPanelWidth}px`)
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

        // Close the photographer details panel
        d3.select("#details-expand--closebutton").on("click", () => {
            detailsContainer.transition()
                .duration(transitionDuration)
                .style("right", `-${rightPanelWidth}px`)
                .on("end", () => detailsContainer.style("display", "none"));

            chartControlsContainer.transition()
                .duration(transitionDuration)
                .style("margin-left", "0px");

            d3.select("#chart--container")
                .transition()
                .duration(transitionDuration)
                .style("margin-left", "0px");

            detailsPanelIsVisible = false;
            resetView();

        });

        let whichSelectedCategories = new Map();
        Object.keys(codeValues).forEach(k => whichSelectedCategories.set(k, true));

        // For global photography history events, handle filtering events by category
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


        // A generic function that resets all of the possible interactive state changes
        const resetView = () => {
            d3.selectAll(".photographer--g")
                .interrupt()
                .attr("opacity", 1);

            d3.selectAll("text")
                .interrupt()
                .classed("selected", false);

            d3.selectAll(".vitals--g")
                .interrupt()
                .attr("opacity", 0);

            d3.selectAll(".photographer--event-container")
                .classed("element--visible", false);

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
                el.classed("event--highlight", true);
            
            } else if(type === "individual") {
                // mouseover event for individual photographer timeline
                let tooltipY = group.datum()['yPosition'] + tooltipMargin;

                photographerTooltip.style("visibility", "visible")
                    .style("right", `${WIDTH - TIMESCALE(yearParse(d.year)) + tooltipMargin}px`)
                    .style("top", `${tooltipY}px`);

                photographerTooltip.html(`<h3 class='heading--name'>${d.name}</h3><h4 class='heading--year'>${d.year}</h4><p>${stripExtraSpaceAfterParentheses(d.event)}</p>`);

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

    }

    // Initialize the timeline drawing
    renderTimeline();

    // When window resizes, will need to redraw the timeline;
    // the following code creates an overlay that hides the 
    // timeline and then makes the timeline visible when resize is done
    const resizeOverlay = d3.select("#resize--overlay");
    resizeOverlay.style("visibility", "hidden");
    let resizeEvent;
    let currentWindowWidth = window.innerWidth;
    window.addEventListener("resize", () => {
        let newWindowWidth = window.innerWidth;
        if(newWindowWidth == currentWindowWidth) return;

        // Update width of #chart element
        WIDTH = document.querySelector("#chart").clientWidth;
        resizeOverlay.style("visibility", "visible");
        clearTimeout(resizeEvent);
        resizeEvent = setTimeout(() => { renderTimeline(); resizeOverlay.style("visibility", "hidden"); }, 100);
        currentWindowWidth = newWindowWidth;
    });

    /* FREE TEXT SEARCH */
    const labels = [
        ["birthRegion", "Birth place"],
        ["deathRegion", "Death place"],
        ["bio", "Biography"]
    ];

    // Do not trigger free text search for the following phrases
    const stopPhrases = [
        "pho",
        "phot",
        "photo",
        "photog",
        "photogr",
        "photogra",
        "photograp",
        "photos",
        "photograph",
        "photography",
        "photographe",
        "photographer",
        "jap",
        "japa",
        "japan",
        "japanese",
        "born",
        "died",
        "active",
        "inactive",
        "birth",
        "death",
    ];

    const labelsMap = new Map(labels);
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
        // Do not trigger free text search if stop phrase found
        if(stopPhrases.indexOf(inputValue) >= 0) return;
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

        if(matches.length == 0) return;

            nonMatches.forEach(el => {
                d3.select(el)
                    .attr("opacity", fadeOpacity);
            });

        
            d3.selectAll(".search-tooltip").remove();

            let matchRegExp = new RegExp(`(${inputValue})`, "gi")
            matches.each(function(d, mi) {

                let tY = d.yPosition;
                d3.select(this)
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
                            // if(mData.facet === "bio") {
                            //     // For bio matches, don't display whole bio search match -- just the term that matched
                            //     formattedValue = `<span class='search-result--match'>${mData.value.match(matchRegExp)}</span>`
                            // }
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

    // Reset search field if click outside input
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

    // Photographer axis
    legendG.append("line")
        .attr("class", "photographer--axis")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", availableDrawingWidth)
        .attr("y2", 0);

    // Axis for active years
    legendG.append("line")
        .attr("class", "photographer--activeyears")
        .attr("x1", availableDrawingWidth * 0.25)
        .attr("y1", 0)
        .attr("x2", availableDrawingWidth * 0.75)
        .attr("y2", 0);

    // Circle for active start year
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

    // Circle for active end year
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

    // Triangle for photographer birth
    legendG.append("path")
        .attr("class", "photographer--birth")
        .attr("d", d3.symbol(d3.symbolTriangle).size(triangleSymbolSize))
        .attr("transform", `rotate(90)`);

    legendG.append("circle")
        .attr("class", "marker--contrast")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 2);

    // Square for photographer death
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

    // Now, draw labels for the legend markers
    const legendLabelMargin = 20;
    legendG.append("text")
        .attr("class", "legend--label")
        .attr("x", 0)
        .attr("y", -legendLabelMargin)
        .text("Birth");

    legendG.append("text")
        .attr("class", "legend--label")
        .attr("x", availableDrawingWidth*0.25)
        .attr("y", -legendLabelMargin)
        .text("Active");

    legendG.append("text")
        .attr("class", "legend--label")
        .attr("x", availableDrawingWidth*0.75)
        .attr("y", -legendLabelMargin)
        .text("Inactive");

    legendG.append("text")
        .attr("class", "legend--label")
        .attr("x", availableDrawingWidth)
        .attr("y", -legendLabelMargin)
        .text("Death");

});