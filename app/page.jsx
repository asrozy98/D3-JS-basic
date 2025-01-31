"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import indonesia from "../assets/indonesiaGeo.json";
import school from "../assets/schoolData.json";
import useResizeObserver from "../components/useResizeObserver";
import DonutChart from "../components/donutChart";
import { motion } from "framer-motion";

const satuanPendidikan = [
  "kbSederajat",
  "tkSederajat",
  "sdSederajat",
  "smpSederajat",
  "smaSederajat",
  "smkSederajat",
  "slb",
  "tpa",
];

const formatNameAndColor = (name) => {
  switch (name) {
    case "kbSederajat":
      return { name: "KB/PAUD", color: "#d946ef" };
    case "tkSederajat":
      return { name: "TK", color: "#4f46e5" };
    case "sdSederajat":
      return { name: "SD", color: "#2563eb" };
    case "smpSederajat":
      return { name: "SMP", color: "#0ea5e9" };
    case "smaSederajat":
      return { name: "SMA", color: "#facc15" };
    case "smkSederajat":
      return { name: "SMK", color: "#f97316" };
    case "slb":
      return { name: "SLB", color: "#dc2626" };
    case "tpa":
      return { name: "TPA", color: "#713f12" };
    default:
      return {
        name: name
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/^./, (str) => str.toUpperCase()),
        color: "#0891b2",
      };
  }
};

function App() {
  const svgRef = useRef(null);
  const wrapperRef = useRef();
  const dimensions = useResizeObserver(wrapperRef);
  const [tooltip, setTooltip] = useState(null);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");

  const geoData = {
    ...indonesia,
    features: indonesia.features.map((feature) => {
      const data = school.find((d) =>
        d.district.namaWilayahDagri
          .toLocaleLowerCase()
          .includes(feature.properties.name.toLocaleLowerCase())
      );

      if (data === null || data === undefined) {
        return {
          ...feature,
          properties: {
            ...feature.properties,
            satuanPendidikanStatistics: [],
            totalSatuanPendidikan: 0,
          },
        };
      }
      const newData = Object.entries(data.satuanPendidikanStatistics).map(
        ([key, value]) => ({
          name: formatNameAndColor(key).name,
          color: formatNameAndColor(key).color,
          value: value,
        })
      );

      return {
        ...feature,
        properties: {
          ...feature.properties,
          satuanPendidikanStatistics: newData,
          totalSatuanPendidikan: data.totalSatuanPendidikan,
        },
      };
    }),
  };

  useEffect(() => {
    const { width, height } =
      dimensions || wrapperRef.current.getBoundingClientRect();

    // Define the range thresholds and colors
    const thresholds = [0, 1000, 10000, 17000, 35000, 50000];
    const colors = ["lightblue", "#bbf7d0", "#4ade80", "#16a34a", "#14532d"];

    d3.select(svgRef.current).selectAll("*").remove();
    // Create color scale using scaleThreshold
    const colorScale = d3.scaleThreshold().domain(thresholds).range(colors);
    // Select SVG element
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .on("click", reset);

    // Define projection and path generator
    const projection = d3
      .geoMercator()
      .fitSize([width, height], geoData)
      .precision(100);
    const pathGenerator = d3.geoPath().projection(projection);

    const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed);

    // map
    const mapGroup = svg.append("g").attr("class", "map-group");

    mapGroup
      .selectAll("path")
      .data(geoData.features)
      .join("path")
      .attr("d", pathGenerator)
      .attr("fill", (feature) => {
        const data = school.find((d) =>
          d.district.namaWilayahDagri
            .toLocaleLowerCase()
            .includes(feature.properties.name.toLocaleLowerCase())
        );
        if (data === null || data === undefined) {
          return "lightblue";
        }
        return colorScale(data.totalSatuanPendidikan);
      })
      .attr("stroke", "black")
      .attr("transform", `translate(${width / 2}, ${height / 2}) scale(0.01)`)
      .on("mouseover", (event, feature) => {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: (
            <div className="bg-white border-solid border-2 border-gray-300 rounded-lg p-2">
              <h1 className="font-bold ">{feature.properties.name}</h1>
              <hr className="my-2 border-gray-300" />
              <p>
                Total Sekolah:{" "}
                {feature?.properties?.totalSatuanPendidikan?.toLocaleString() ||
                  0}
              </p>
              <DonutChart
                data={feature?.properties?.satuanPendidikanStatistics}
              />
            </div>
          ),
        });

        const [cx, cy] = pathGenerator.centroid(feature);

        d3.select(event.target)
          .raise()
          .transition()
          .duration(300)
          .attr(
            "transform",
            `translate(${cx}, ${cy}) scale(1.1) translate(${-cx}, ${-cy})`
          )
          .attr("stroke", "black")
          .attr("fill", "orange")
          .attr("stroke-width", 2);

        svg
          .selectAll(".province-label")
          .filter((d) => d === feature)
          .classed("text-[8px] sm:text-base fill-white", true)
          .raise()
          .transition()
          .duration(300);
      })
      .on("mouseout", (event, feature) => {
        setTooltip(null);

        d3.select(event.target)
          .transition()
          .duration(300)
          .attr("transform", "scale(1)")
          .attr("stroke", "black")
          .attr("fill", (feature) => {
            if (feature.properties.totalSatuanPendidikan === 0) {
              return "lightblue";
            }
            return colorScale(feature.properties.totalSatuanPendidikan);
          })
          .attr("stroke-width", 1);

        svg
          .selectAll(".province-label")
          .filter((d) => d === feature)
          .classed("text-[8px] sm:text-base fill-black", true)
          .transition()
          .duration(300);
      })
      .transition()
      .duration(2000)
      .delay((_, i) => i * 10)
      .attr("transform", "translate(0, 0) scale(1)");

    // Add province labels
    mapGroup
      .selectAll(".province-label")
      .data(geoData.features)
      .join("text")
      .attr("class", "province-label")
      .attr("x", width) // Start from the left
      .attr("y", height / 2) // Center vertically
      .text((feature) => feature.properties.name)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .classed("text-[8px] sm:text-base fill-red-500 align-middle", true)
      .transition()
      .duration(4000) // Match the duration of the circle
      .delay((_, i) => i * 50) // Same delay as circle;
      .attr("x", (feature) => pathGenerator.centroid(feature)[0])
      .attr("y", (feature) => pathGenerator.centroid(feature)[1]);

    function zoomed(event) {
      const { transform } = event;
      svg.attr("transform", transform);
      svg.attr("stroke-width", 1 / transform.k);
    }

    function reset() {
      // svg.transition().style("fill", null);
      svg
        .transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity,
          d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
        );
    }

    svg.call(zoom);

    const bumbleSchool = [];
    geoData.features.map((d) => {
      d?.properties?.satuanPendidikanStatistics?.map((e) => {
        if (filter === "all") {
          bumbleSchool.push({
            province: d.properties.name,
            satuan: e.name,
            color: e.color,
            total: e.value,
          });
        } else {
          if (e.name === formatNameAndColor(filter).name)
            bumbleSchool.push({
              province: d.properties.name,
              satuan: e.name,
              color: e.color,
              total: e.value,
            });
        }
      });
    });

    const bubbleScale = d3
      .scaleSqrt()
      .domain([0, d3.max(bumbleSchool.map((d) => d.total))])
      .range([width > 500 ? 5 : 1, width > 500 ? 30 : width * 0.02]);

    const randomPoints = bumbleSchool.map((d) => {
      const feature = geoData.features.find((f) =>
        f.properties.name
          .toLocaleLowerCase()
          .includes(d.province.toLocaleLowerCase())
      );
      if (!feature) return null;

      const bounds = pathGenerator.bounds(feature); // Get bounding box
      const [xMin, yMin] = bounds[0];
      const [xMax, yMax] = bounds[1];

      let point;
      let attempts = 0;
      do {
        const randomX = Math.random() * (xMax - xMin) + xMin;
        const randomY = Math.random() * (yMax - yMin) + yMin;
        point = [randomX, randomY];
        attempts++;
      } while (
        !d3.geoContains(feature, projection.invert(point)) &&
        attempts < 10
      );

      return point && { ...d, x: point[0], y: point[1] };
    });

    // Add Bubble Chart
    const bubbleGroup = svg.append("g").attr("class", "bubble-group");

    bubbleGroup
      .selectAll(".bubble-group")
      .data(randomPoints.filter((d) => d !== null))
      .join("g")
      .attr("class", "bubble-group")
      .each(function (d) {
        const group = d3.select(this);

        // Add Circle
        group
          .append("circle")
          .attr("cx", 0) // Starting from the left
          .attr("cy", height / 2) // Center vertically
          .attr("r", 0) // Start with a radius of 0
          .transition()
          .duration(2000) // Duration of the animation
          .delay((_, i) => i * 50)
          .attr("cx", d.x)
          .attr("cy", d.y)
          .attr("r", bubbleScale(d.total))
          .attr("fill", d.color)
          .attr("opacity", 0.7);

        // Add Province Name
        group
          .append("text")
          .attr("x", 0) // Start from the left
          .attr("y", height / 2) // Center vertically
          .attr("dy", "0.35em")
          .attr("text-anchor", "middle")
          .text(d.satuan)
          .classed("text-[2px] sm:text-[8px] fill-white", true)
          .attr("x", d.x)
          .attr("y", d.y)
          .transition()
          .duration(2000) // Match the duration of the circle
          .delay((_, i) => i * 50); // Same delay as circle
      });

    // Add Legend
    const legendWidth = 300;
    const legendHeight = 10;
    const legendX = 20;
    const legendY = height - 50;

    // Append a group for the legend and give it a class for easier selection
    const legendGroup = mapGroup
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    // Create rectangles for each color in the legend
    colors.forEach((color, i) => {
      legendGroup
        .append("rect")
        .attr("x", (i * legendWidth) / colors.length)
        .attr("y", -20)
        .attr("width", legendWidth / colors.length)
        .attr("height", legendHeight)
        .style("fill", color);
    });

    // Add text for each threshold
    thresholds.forEach((threshold, i) => {
      legendGroup
        .append("text")
        .attr("x", (i * legendWidth) / colors.length)
        .attr("y", width > 500 ? legendHeight : legendHeight - 10)
        .text(threshold.toLocaleString())
        .classed("text-xs sm:text-base fill-black align-middle", true);
    });

    // Add final text for >1,000,000
    legendGroup
      .append("text")
      .attr("x", legendWidth)
      .attr("y", width > 500 ? legendHeight : legendHeight - 10)
      .classed("text-xs sm:text-base fill-black align-middle", true);
  }, [dimensions, filter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.receiveFilterFromFlutter)
        window.receiveFilterFromFlutter = (data) => {
          setFilter(data);
        };
    }
  }, []);

  return (
    <div className="w-full flex flex-col gap-2 p-4">
      <motion.div
        className="hidden sm:flex sm:flex-col w-full bg-white text-black shadow-lg rounded-lg p-4"
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <h3 className="text-lg md:text-xl font-semibold mb-2">
          Pilih satuan pendidikan
        </h3>
        <select
          defaultValue={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {satuanPendidikan.map((item) => (
            <option key={item} value={item}>
              {formatNameAndColor(item).name}
            </option>
          ))}
          <option value="all">Semua</option>
        </select>
      </motion.div>

      <motion.div
        className="w-full h-[calc(100vh-180px)] bg-white text-black shadow-lg rounded-lg overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative w-full h-full p-4" ref={wrapperRef}>
          <div className="hidden sm:flex sm:flex-col w-full text-center">
            <h1 className="text-sm md:text-xl font-bold">
              Jumlah Satuan Pendidikan Aktif di Indonesia
            </h1>
            <p className="text-sm md:text-base text-red-500">{message}</p>
          </div>
          <svg ref={svgRef} className="w-full h-full"></svg>
          <div className="absolute top-2 lg:bottom-10 lg:top-auto w-full flex flex-col sm:flex-row justify-center px-4">
            {satuanPendidikan.map((item) => (
              <div
                key={item}
                className="flex flex-row-reverse sm:flex-row items-center"
              >
                <p className="text-xs md:text-base mx-2">
                  {formatNameAndColor(item).name}
                </p>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 50,
                    backgroundColor: formatNameAndColor(item).color,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: tooltip.x + 10,
              top: tooltip.y + 10,
              padding: "5px",
              pointerEvents: "none",
            }}
          >
            {tooltip.content}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default App;
