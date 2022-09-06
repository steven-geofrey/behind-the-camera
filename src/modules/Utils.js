import * as d3 from "d3";

export const sortPhotographerEvents = (photographer, photographerEvents) => {
    if(photographerEvents.length == 0) return [];
    let modifiedPhotographerEvents = [...photographerEvents];
    const vitalsToCheck = ["birth", "active", "inactive", "death"];
    vitalsToCheck.forEach(v => {
        if(!photographer[v] || photographer[v] === "unknown") return;
        if(v === "birth" || v === "active") {
            // Need to prepend birth or active
            modifiedPhotographerEvents.splice(0, 0, {year: photographer[v], displayYear: photographer[v], eventClass: v, event: v, eventType: "vital"});

        } else if(v === "inactive" || v === "death") {
            // Need to append inactive or death
            modifiedPhotographerEvents.push({year: photographer[v], displayYear: photographer[v], eventClass: v, event: v, eventType: "vital"});
        }
    });


    let sortedPhotographerEvents = modifiedPhotographerEvents.sort((a,b) => a.year - b.year);

    return sortedPhotographerEvents;
    // const vitalsToCheck = ["birth", "active", "inactive", "death"];
    let hasVitals = vitalsToCheck.filter(v => !photographer[v] || photographer[v] === "unknown" ? false : true);
    let intervals = [];

    for(vi = 0; vi < hasVitals.length - 1; vi++) {
        let vitalStart = hasVitals[vi];
        let vitalStartYear = photographer[vitalStart];
        let vitalEnd = hasVitals[vi+1];
        let vitalEndYear = photographer[vitalEnd];
        let filteredEvents = sortedPhotographerEvents.filter(s => s.year >= vitalStartYear && s.year < vitalEndYear);

        intervals.push({vitalStart, vitalStartYear, vitalEnd, vitalEndYear, filteredEvents});

    }

    let orderedPhotographerEvents = [];
    intervals.forEach(interval => {
        if(interval.vitalStart === "birth") {
            orderedPhotographerEvents.push({year: photographer[vitalStart], displayYear: photographer[vitalStart], eventClass: vitalStart, event: vitalStart, eventType: "vital"});

        }
    });

    hasVitals.forEach(v => {
        let interval = intervals.filter(i => i.vitalStart === v);

        if(v === "birth") {
            orderedPhotographerEvents.push({year: photographer[v], displayYear: photographer[v], eventClass: v, event: v, eventType: "vital"});
            orderedPhotographerEvents.push([...interval.filteredEvents]);
        } else if(v === "active") {

        }
    })

}