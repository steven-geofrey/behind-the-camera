require("./style.css");
import * as d3 from "d3";

const clean = function(d) {
    return d.trim();
}

const PROMISES = [
    d3.csv("./data/2022-04-14_global-timeline.csv", d => {
        if(d['Year'] === "") return;
        return {
            year: d['Year'],
            event: d['Event'],
            coding: d['Coding'],
            citation: d['Citations'],
            images: d['Images']
        }
    }),
    d3.csv("./data/2022-04-14_japan-timeline.csv", d => {
        if(d['YEAR'] === "") return;
        return {
            year: d['YEAR'],
            event: d['EVENT'],
            citation: d['CITATION']
        }
    }),
    d3.csv("./data/2022-04-14_photographer-bibliography.csv", d => {
        if(d['Name'] === "") return;
        return {
            name: clean(d['Name']),
            bibliography: d['Selected Bibliography']
        }

    }),
    d3.csv("./data/2022-04-14_photographer-timelines.csv", d => {
        if(d['Name'] === "") return;
        return {
            name: clean(d['Name']),
            year: d['Year'],
            event: d['Event'],
            image: d['Image'],
            caption: d['Image caption']
        }
    }),
    d3.csv("./data/2022-04-14_photographers.csv", d => {
        if(d['Name - romaji'] === "") return;
        return {
            romaji: clean(d['Name - romaji']),
            kanji: d['Name - kanji'],
            region: d['Region'],
            birth: d['Birth date'] || null,
            active: d['Active date'] || null,
            inactive: d['Inactive date'] || null,
            death: d['Death date'] || null,
            bio: d['Bio'],
            link: d['Link'],
            image: ['Image'],
            caption: d['Image Caption']
        }
    })
];

Promise.all(PROMISES).then(response => {

    const GLOBAL_TIMELINE = response[0],
        JAPAN_TIMELINE = response[1],
        PHOTOGRAPHER_BIBLIO = response[2],
        PHOTOGRAPHER_TIMELINE = response[3],
        PHOTOGRAPHERS = response[4];


    console.log(GLOBAL_TIMELINE);
    console.log(JAPAN_TIMELINE);
    console.log(PHOTOGRAPHERS);
    console.log(PHOTOGRAPHER_TIMELINE);
    console.log(PHOTOGRAPHER_BIBLIO);



    const WIDTH = document.querySelector("#chart").clientWidth;
    const MARGIN = {top: 40, left: 50, right: 50, bottom: 50};

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
    const details = {
        container: d3.select("#details"),
        romaji: d3.select("#details--romaji"),
        kanji: d3.select("#details--kanji"),
        // region: d3.select("#details--region"),
        lifetime: d3.select("#details--lifetime"),
        bio: d3.select("#details--bio"),
        events: d3.select("#details--events"),
        bibliography: d3.select("#details--biblio")
    };

    const timelineExpandContainer = d3.select("#timeline-expand--container");



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

    let yearParse = d3.timeParse("%Y");
    let plottingArea = svg.append("g")
        .attr("transform", `translate(0, ${20})`);


    let selectedPhotographer = "Shima Ryū";

    PHOTOGRAPHERS.forEach((photographer, i) => {

        let g = plottingArea.append("g")
            .datum({yPosition: UNIT_HEIGHT * i})
            .attr("transform", `translate(0, ${UNIT_HEIGHT * i})`);

        let birth = yearParse(photographer.birth);
        let active = yearParse(photographer.active);
        let inactive = yearParse(photographer.inactive);
        let death = yearParse(photographer.death);

        console.log(active,inactive)

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
                .attr("height", 4)
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
        const boxMarkerWidth = 9;

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
                    .attr("d", d3.symbol(d3.symbolTriangle).size(64))
                    .attr("transform", `translate(${TIMESCALE(vital)},0)rotate(90)`);

            } else {
                g.append("circle")
                    .attr("r", 5)
                    .attr("class", className)
                    .attr("cx", TIMESCALE(vital))
                    .attr("cy", 0);

            }

            // Draw contrasting circle in foreground for precise reading
            g.append("circle")
            .attr("class", "marker--contrast")
            .attr("cx", TIMESCALE(vital))
            .attr("cy", 0)
            .attr("r", 1);
        
        });

        // If photographer has individual timeline events, draw them
        let photographerEvents = PHOTOGRAPHER_TIMELINE.filter(pt => pt.name === photographer.romaji);
        if(photographerEvents.length > 0) {
            let photographerEventMarkers = g.selectAll(".photographer--event")
                .data(photographerEvents)
                .join("line")
                    .attr("class", "photographer--event")
                    .attr("x1", pe => TIMESCALE(yearParse(pe.year)))
                    .attr("y1", -12)
                    .attr("x2", pe => TIMESCALE(yearParse(pe.year)))
                    .attr("y2", 0)
                    .attr("stroke", pe => {
                        let yp = yearParse(pe.year);
                        if(yp >= active && yp <= inactive) {
                            return "#F6C900";
                        } else {
                            return "#CCCCCC";
                        }
                    })
                    .lower();

            photographerEventMarkers.on("mouseover", function() {
                console.log("grouppppp",g.datum())
                mouseOver("individual", g, d3.select(this));
            }).on("mouseout", () => { mouseOut("individual"); })
        }

        // Determine which vital to use to position label
        let whichVital = birth || active || inactive || death;

        // Draw name label

        let nameLabel = g.append("g")
            .attr("transform", `translate(${TIMESCALE(whichVital)}, 0)`);

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



        // On label click, open details

        nameLabel.on("mouseover", () => {

            if(photographer.romaji === selectedPhotographer) return;

            nameLabel.selectAll("text")
                .style("font-weight", "bold");
        }).on("mouseout", () => {

            if(photographer.romaji === selectedPhotographer) return;

            nameLabel.selectAll("text")
                .style("font-weight", "normal");
        });

        nameLabel.on("click", () => {


            // If timeline is opened, close it
            timelineExpandContainer.style("visibility", "hidden");

            selectedPhotographer = photographer.romaji;
            
            svg.selectAll(".photographer--name")
                .style("font-weight", "normal");

            nameLabel.selectAll("text")
                .style("font-weight", "bold");

            for(let handle in details) {

                let el = details[handle];

                if(handle === "romaji") el.html(photographer.romaji);
                if(handle === "kanji") el.html(photographer.kanji);
                // if(handle === "region" && photographer.region) el.html(photographer.region);
                if(handle === "lifetime") {
                    let birthYear = photographer.birth ? `b. ${photographer.birth}` : "birth unknown";
                    let deathYear = photographer.death ? `d. ${photographer.death}` : "death unknown";
                    let regionValue = photographer.region || "region unknown";
                    el.html(`(${birthYear} &ndash; ${deathYear}, ${regionValue})`);
                }
                if(handle === "bio") el.html(photographer.bio);
                if(handle === "events") {
                    let keyEvents = PHOTOGRAPHER_TIMELINE.filter(pt => pt.name === photographer.romaji);
                    if(photographerEvents.length > 0) {
            
                        el.select("#events--container").selectAll("*").remove();
                        el.select("#events--container").selectAll(".event--row")
                            .data(keyEvents)
                            .join("div")
                                .attr("class", "event--row")
                                .html(k => `<div class='year'>${k.year}</div><div class='event'>${k.event}</div>`);

                        el.style("visibility", "visible");
                    } else {
                        el.style("visibility", "hidden");
                    }
                }

                if(handle === "bibliography") {
                    let match = PHOTOGRAPHER_BIBLIO.filter(p => p.name === photographer.romaji);

                    if(match.length > 0) {
                        el.select("ul").selectAll("li").remove();
                        el.select("ul").selectAll("li")
                            .data(match)
                            .join("li")
                                .html(m => m.bibliography);

                        el.style("visibility", "visible");
                    } else {
                        el.style("visibility", "hidden");
                    }
                }
    
            }
    
        });

        // Initialize details container with Shima Ryu for demonstration
        if(photographer.romaji === selectedPhotographer) nameLabel.dispatch("click");


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

    let codeValues = {
        "T": {label: "Technology", className: "event--technology"},
        "P": {label: "Professional", className: "event--professional"},
        "I": {label: "Institutional", className: "event--institutional"},
        // "P": {label: "Professional (agencies, professional associations)", className: "event--professional"},
        // "I": {label: "Institutional (schools and museums)", className: "event--institutional"},
        "E/P": {label: "Exhibitions/Publications", className: "event--exhibition"}
    };

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
    let photographerTooltip = d3.select("#chart--container")
        .append("div")
        .attr("class", "tooltip");

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


            if(events === GLOBAL_TIMELINE) {
                d3.select("#timeline-expand--filters").style("display", "block");
            } else {
                d3.select("#timeline-expand--filters").style("display", "none");
            }

            timelineExpandContainer.select("#timeline-expand--events").selectAll("*").remove();

            timelineExpandContainer.select("#timeline-expand--header").html(events === GLOBAL_TIMELINE ? "Events in Global Photography" : "Events in Japanese Photography");


            timelineExpandContainer.select("#timeline-expand--events").selectAll(".event--row")
            .data(events)
            .join("div")
                .attr("class", "event--row")
                .html(k => {

                    if(events === GLOBAL_TIMELINE) {
                        let eventCodes = [];

                        for(let c in codeValues) {
                            if(k["coding"].includes(c)) eventCodes.push(c);
                        }
        
                        let spans = [];
                        eventCodes.forEach(ec => {
                            let v = codeValues[ec];
                            spans.push(`<span class='event--label ${v.className}'>${v.label}</span>`);
                        });

                        return `<div class='year'>${k.year}</div><div class='event'>${spans.join("")}<br><br>${k.event}</div>`;
        
                    } else {

                        return `<div class='year'>${k.year}</div><div class='event'>${k.event}</div>`

                    }
                });


            timelineExpandContainer.style("visibility", "visible");

        });
    });

    d3.select("#timeline-expand--closebutton").on("click", () => {
        timelineExpandContainer.style("visibility", "hidden");
    });

    let whichSelectedCategories = [...Object.keys(codeValues)];

    d3.select("#timeline-expand--filters").selectAll("input").on("change", function() {

        // Get all currently-checked categories
        whichSelectedCategories = d3.select("#timeline-expand--filters").selectAll("input:checked").nodes().map(n => n.value);

        
        timelineExpandContainer.selectAll(".event--row")
            .classed("event--hidden", k => !whichSelectedCategories.some(c => k.coding.includes(c)));

        // let value = d3.select(this).property("value");
        // let isChecked = d3.select(this).property("checked");

        // let filteredEvents = timelineExpandContainer.selectAll(".event--row")
        //     .filter(e => e.coding.includes(value));


        // if(isChecked) {
        //     filteredEvents.classed("event--hidden", false);
        // } else {

        //     filteredEvents.classed("event--hidden", true);
        // }
    });



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
            timelinesTooltip.style("visibility", "visible")
            .style("left", `${TIMESCALE(yearParse(d.year))}px`)
            .style("top", `${group.datum()['yPosition'] + tooltipMargin}px`);

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
                

                timelinesTooltip.html(`<h3 class='heading--year'>${d.year} ${spans.join("")}</h3>${d.event}${d.citation ? "<br><br><i>Citation:</i> " + d.citation : ""}`);

            } else {
                timelinesTooltip.html(`<h3 class='heading--year'>${d.year}</h3>${d.event}${d.citation ? "<br><br><i>Citation:</i> " + d.citation : ""}`);

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

    })


});