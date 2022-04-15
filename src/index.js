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
        region: d3.select("#details--region"),
        bio: d3.select("#details--bio"),
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
    const UNIT_HEIGHT = 30;

    let yearParse = d3.timeParse("%Y");
    let plottingArea = svg.append("g")
        .attr("transform", `translate(0, ${20})`);

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

        });

        // If photographer has individual timeline events, draw them
        let photographerEvents = PHOTOGRAPHER_TIMELINE.filter(pt => pt.name === photographer.romaji);
        if(photographerEvents.length > 0) {
            let photographerEventMarkers = g.selectAll(".photographer--event")
                .data(photographerEvents)
                .join("line")
                    .attr("class", "photographer--event")
                    .attr("x1", pe => TIMESCALE(yearParse(pe.year)))
                    .attr("y1", -7)
                    .attr("x2", pe => TIMESCALE(yearParse(pe.year)))
                    .attr("y2", 7)
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
        let nameLabel = g.append("text")
            .attr("class", "photographer--name")
            .attr("x", TIMESCALE(whichVital))
            .attr("y", 0)
            .attr("dx", "-6pt")
            .text(photographer.romaji);


        // On label click, open details


        nameLabel.on("click", () => {
            for(let handle in details) {

                let el = details[handle];

                if(handle === "romaji") el.html(photographer.romaji);
                if(handle === "kanji") el.html(photographer.kanji);
                if(handle === "region" && photographer.region) el.html(photographer.region);
                if(handle === "bio") el.html(photographer.bio);
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
        if(photographer.romaji === "Shima Ryū") nameLabel.dispatch("click");


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
        .attr("transform", `translate(0, ${MARGIN.top})`)
        .call(d3.axisTop().scale(TIMESCALE).tickValues(years));

    // Draw the global events timeline
    let tooltip = d3.select("#container")
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

        // events.forEach(e => {
        //     let x = TIMESCALE(yearParse(e.year));
        //     let marker = g.append("line")
        //         .attr("class", "event--marker")
        //         .attr("r", 5)
        //         .attr("x1", x)
        //         .attr("y1", -6)
        //         .attr("x2", x)
        //         .attr("y2", 6);

        //     marker.on("mouseover", (event, datum, el) => {

        //         mouseOver(e, g, el);
        //         // tooltip.style("visibility", "visible")
        //         //     .style("left", `${x}px`)
        //         //     .style("top", `${y}px`)
        //         //     .html(`<b>${e.year}</b><br>${e.event}${e.citation ? "<br><br><i>Citation:</i> " + e.citation : null}`);

        //     }).on("mouseout", mouseout);
        // });

        timelineAxis.on("mousemove", (event) => {
            console.log(events)

            let position = d3.pointer(event)[0];
            let date = TIMESCALE.invert(position);
            let i = d3.bisectCenter(events.map(e => !yearParse(e.year) ? null : yearParse(e.year).getTime()), date.getTime());
            let el = g.selectAll(".event--marker").filter((em,j) => j == i);
            // let closest = events[i];

            mouseOver("global", g, el);

            // tooltip.style("visibility", "visible")
            //     .style("left", `${TIMESCALE(yearParse(closest.year))}px`)
            //     .style("top", `${y + tooltipMargin}px`)
            //     .html(`<b>${closest.year}</b><br>${closest.event}${closest.citation ? "<br><br><i>Citation:</i> " + closest.citation : null}`);

            // g.selectAll(".event--marker").classed("event--highlight", false);
            // g.selectAll(".event--marker").filter((em,j) => j == i).classed("event--highlight", true);

        }).on("mouseout", () => { mouseOut("global"); });

        // }).on("mouseout", () => {
        //     g.selectAll(".event--marker").classed("event--highlight", false);
        //     tooltip.style("visibility", "hidden");
        // });

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
            tooltip.style("visibility", "visible")
            .style("left", `${TIMESCALE(yearParse(d.year))}px`)
            .style("top", `${group.datum()['yPosition'] + tooltipMargin}px`);

            // If it's a global event, include event coding in tooltip
            if("coding" in d) {
                let eventCodes = [];

                console.log(d["coding"])
                for(let c in codeValues) {
                    if(d["coding"].includes(c)) eventCodes.push(c);
                }

                let spans = [];
                eventCodes.forEach(ec => {
                    let v = codeValues[ec];
                    spans.push(`<span class='event--label ${v.className}'>${v.label}</span>`);
                });
                

                tooltip.html(`<h3 class='heading--year'>${d.year} ${spans.join("")}</h3>${d.event}${d.citation ? "<br><br><i>Citation:</i> " + d.citation : ""}`);

            } else {
                tooltip.html(`<h3 class='heading--year'>${d.year}</h3>${d.event}${d.citation ? "<br><br><i>Citation:</i> " + d.citation : ""}`);

            }

            group.selectAll(".event--marker").classed("event--highlight", false);
            // group.selectAll(".event--marker").filter((em,j) => j == i).classed("event--highlight", true);
            el.classed("event--highlight", true);
        
        } else if(type === "individual") {
        // mouseover event for individual photographer timeline

            tooltip.style("visibility", "visible")
                .style("left", `${TIMESCALE(yearParse(d.year)) + tooltipMargin}px`)
                .style("top", `${+timelinesContainer.attr("height") + group.datum()['yPosition'] + tooltipMargin}px`);

            tooltip.html(`<h3 class='heading--name'>${d.name}</h3><h4 class='heading--year'>${d.year}</h4><br>${d.event}`);

        }



    };

    let mouseOut = (type) => {

        if(type === "global") {
            timelinesContainer.selectAll(".event--marker").classed("event--highlight", false);
            tooltip.style("visibility", "hidden");
                
        } else if(type === "individual") {
            tooltip.style("visibility", "hidden");

        }
    };


});