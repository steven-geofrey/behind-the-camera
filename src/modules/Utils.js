// The following script sorts events for individual photographers
// in the details panel, so that active and inactive years are
// correctly positioned in the order of events
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

}

// Code values for global photography event categories
export const codeValues = {
    "T": {label: "Technology", className: "event--technology"},
    "P": {label: "Professional", className: "event--professional"},
    "I": {label: "Institutional", className: "event--institutional"},
    "E/P": {label: "Exhibitions/Publications", className: "event--exhibition"}
};
