//
// ElasticSearch results and D3.js
//
// Source: http://www.elasticsearch.org/blog/data-visualization-elasticsearch-aggregations/
//
(function () {
    // TODO: replace by user/pass: demo/demo
    var viewerToken = "ec6f313dac6b6622b347154d99602e2a6fc60f379a9e3f12fd114cb86920cbef";

    var session = new Daybed.Session(server, {token: viewerToken});
    session.searchRecords(model, {
        query: {
            match: { webgl: true }
        },
        aggs: {
            browser: {
                terms: {
                    field: "name"
                }
            },
            system: {
                terms: {
                    field: "os"
                }
            }
        }
    })
    .catch(function (error) {
        console.error("Search error", error.message);
        throw error;
    })
    .then(function (resp) {
        var colors = ['#ff7f0e', '#d62728', '#2ca02c', '#1f77b4'];
        donutChart(".chart--browser", resp.aggregations.browser.buckets, colors);
        donutChart(".chart--system", resp.aggregations.system.buckets, colors);
    });


    function donutChart(container, buckets, colors) {
        // d3 donut chart
        var width = 600,
            height = 300,
            radius = Math.min(width, height) / 2;

        var arc = d3.svg.arc()
            .outerRadius(radius - 60)
            .innerRadius(120);

        var pie = d3.layout.pie()
            .sort(null)
            .value(function (d) { return d.doc_count; });

        var svg = d3.select(container).append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width/1.4 + "," + height/2 + ")");

        var g = svg.selectAll(".arc")
            .data(pie(buckets))
            .enter()
            .append("g")
            .attr("class", "arc");

        g.append("path")
            .attr("d", arc)
            .style("fill", function (d, i) { return colors[i]; });

        g.append("text")
            .attr("transform", function (d) { return "translate(" + arc.centroid(d) + ")"; })
            .attr("dy", ".35em")
            .style("text-anchor", "middle")
            .style("fill", "white")
            .text(function (d) { return d.data.key; });
    }
})();
