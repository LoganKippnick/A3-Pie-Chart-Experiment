import * as d3 from "d3";
import { JSDOM } from "jsdom";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dom = new JSDOM('<div id="my_dataviz"></div>');
globalThis.document = dom.window.document;
const outputDirectory = join(dirname(fileURLToPath(import.meta.url)), "charts");


// CHART SETTINGS
const width = 450;
const margin = 40;
const backgroundColor = "transparent";
const sliceColor = "#cccccc";
const restColor = "#ffffff";
const strokeColor = "#000000";
const strokeWidthPx = 0;
const dotRadiusPx = 3;
const percentages = [0.1, 0.15, 0.25, 0.35, 0.45, 0.5, 0.6, 0.75, 0.8, 0.9];
const randAlignmentMinDegreesFromCardinal = 10;


/**
 * Creates a pie chart for the given percentage, alignment, and direction.
 * @param {number} percentage Fraction assigned to the highlighted slice, from 0 to 1.
 * @param {number} alignmentDegrees Starting angle in degrees (0 is top, 90 is right).
 * @param {boolean} clockwise Whether the chart sweeps clockwise from the start angle.
 * @returns A D3 selection containing the generated SVG path elements.
 */
function generatePiePaths(percentage, alignmentDegrees, clockwise) {
    const radius = width / 2 - margin;
    const startRadians = alignmentDegrees * (Math.PI / 180);
    const direction = clockwise ? 1 : -1;
    const endRadians = startRadians + direction * 2 * Math.PI;

    const chart = d3.select("#my_dataviz")
        .append("svg")
            .attr("width", width)
            .attr("height", width)
            .style("background-color", backgroundColor)
        .append("g")
            .attr("transform", `translate(${width / 2}, ${width / 2})`);

    const data = { slice: percentage, rest: 1 - percentage };

    // Key colors by slice name.
    const color = d3.scaleOrdinal()
        .domain(Object.keys(data))
        .range([sliceColor, restColor]);

    const pie = d3.pie()
        .value(d => d[1])
        .sort(null)
        .startAngle(startRadians)
        .endAngle(endRadians);
    const dataReady = pie(Object.entries(data));

    const paths = chart
        .selectAll("path")
        .data(dataReady)
        .join("path")
        .attr("d", d3.arc()
            .innerRadius(0)
            .outerRadius(radius))
        .attr("fill", d => color(d.data[0]))
        .attr("stroke", strokeColor)
        .style("stroke-width", `${strokeWidthPx}px`);

    // Place dot inside the highlighted slice, if requested.
    if (dotRadiusPx > 0) {
        const dotAngle = startRadians + direction * Math.PI * percentage;
        const dotDistance = radius * 0.66;
        chart.append("circle")
            .attr("cx", dotDistance * Math.sin(dotAngle))
            .attr("cy", -dotDistance * Math.cos(dotAngle))
            .attr("r", dotRadiusPx)
            .attr("fill", strokeColor);
    }

    return paths;
}

/**
 * Serializes a generated chart and writes it as an SVG file.
 * @param paths D3 selection containing the chart's SVG path elements.
 * @param {string} filename Destination path for the SVG file.
 */
async function savePieSvg(paths, filename) {
    const svg = paths.node().ownerSVGElement;
    const content = new dom.window.XMLSerializer().serializeToString(svg);
    await writeFile(filename, content, "utf8");
}

// Create the output directory if needed.
await mkdir(outputDirectory, { recursive: true });

// Clear existing chart files.
await rm(join(outputDirectory, "*.svg"), { force: true });

for (const p of percentages) {
    // Top alignment, clockwise.
    await savePieSvg(generatePiePaths(p, 0, true), join(outputDirectory, `top_cw_${p * 100}.svg`));

    // Top alignment, counterclockwise.
    await savePieSvg(generatePiePaths(p, 0, false), join(outputDirectory, `top_ccw_${p * 100}.svg`));

    // Right alignment, clockwise.
    await savePieSvg(generatePiePaths(p, 90, true), join(outputDirectory, `right_cw_${p * 100}.svg`));

    // Two clockwise alignments, at least 10 degrees from cardinal directions.
    for (let i = 1; i <= 2; i++) {
        const quadrant = Math.floor(Math.random() * 4);
        const offsetDegrees = Math.floor(Math.random() * (90 - 2 * randAlignmentMinDegreesFromCardinal)) + randAlignmentMinDegreesFromCardinal;
        const alignmentDegrees = quadrant * 90 + offsetDegrees;
        await savePieSvg(
            generatePiePaths(p, alignmentDegrees, true),
            join(outputDirectory, `rand${i}_cw_${p * 100}.svg`)
        );
    }
}