'use strict';
define(function (require) {

    var templateMarkup = require('text!./visualizer.html'),
        ko = require('knockout'),
        _ = require('lodash'),
        apiFinder = require('finders.api'),
        colorUtils = require('utils.colors'),
        numberUtils = require('utils.numbers'),
        TimeseriesData = require('models.timeseries'),
        moment = require('moment');

    require('knockout.datepicker');

    var dateFormat = 'YYYY-MM-DD';

    function Visualizer(params) {
        var apiType = params.aqs? 'aqsApi' : 'datasets';
        var api = apiFinder({
                api: apiType
            }),
            graph = ko.unwrap(params);

        this.type = graph.type;
        this.title = graph.title;
        this.select = graph.select;
        this.selected = graph.selected;
        // TODO: add this property to the visualizers themselves and then reference
        // like visualizers[this.type].showColumnToggle
        this.columnToggle = this.type !== 'sunburst' && this.type !== 'hierarchy';

        var colorScale = colorUtils.category10();
        if (graph.colors) {
            var domain = [],
                range = [];
            _.forEach(graph.colors, function (val, key) {
                range.push(val);
                domain.push(key);
            });
            colorScale = colorUtils.category10(domain, range);
        }

        this.data = ko.observable(new TimeseriesData());

        // don't love this , the point of having an api finder is to have a common interface
        // for apis such it doesn't matter which one we are using
        if (apiType === 'aqsApi'){
            var aqs = params.aqs;
            var projects = aqs.projects;

            var promise = api.getData({'name':aqs.name, 'granularity':aqs.granularity}, projects);

            promise.then(function (data) {
                this.data(data);
            }.bind(this));

        } else {
            api.getData(graph, ['all']).done(this.data);
        }

        graph.minDate = graph.startDate;
        if (graph.showLastDays) {
            var days = parseInt(graph.showLastDays, 10) || 0;
            if (days > 0) {
                var earliestDate = moment().add(-1 * days, 'days').format(dateFormat);
                if (graph.startDate < earliestDate) {
                    graph.startDate = earliestDate;
                }
            }
        }
        this.startDate = ko.observable(moment(graph.startDate).valueOf());
        this.minDate = ko.observable(moment(graph.minDate).valueOf());
        this.endDate = ko.observable();

        /** If date is a unix tiemstamp change it to ISO format **/
        this.prettyDate = function (value) {
            if (Number.isInteger(value())) {
                return moment(value()).format(dateFormat);
            }
            return value;
        };

        // turn the header into a list of items that can be selected / deselected
        // make it a computed so if the parent changes the data, this updates
        this.filteredHeader = ko.computed(function () {
            var data = ko.unwrap(this.data);

            if (!data) {
                return [];
            }

            var header = data.header.map(function (h, i) {
                return {
                    index: i,
                    title: h,
                    color: colorScale(data.colorLabels[i]),
                    patternLabel: data.patternLabels[i],
                    name: data.patternLabels[i] + ' - ' + h,
                    uniqueId: data.patternLabels[i] + ' - ' + h + (Math.floor(Math.random() * 100000)),
                    selected: ko.observable(true),
                    selectOnly: function () {
                        var onlyThis = this;

                        _.forEach(header, function (hOnly) {
                            hOnly.selected(hOnly === onlyThis);
                        });
                    },
                    selectAll: function () {
                        _.forEach(header, function (hOnly) {
                            hOnly.selected(true);
                        });
                    },
                };
            });

            return _.sortBy(header, function(h){ return h.title.toLowerCase(); });
        }, this);

        this.filteredData = ko.computed(function () {
            var data = ko.unwrap(this.data),
                start = ko.unwrap(this.startDate),
                end = ko.unwrap(this.endDate);

            if (!data) {
                return [];
            }

            var newHeader = _.filter(this.filteredHeader(), function (header) {
                return header.selected();
            });

            data.filter(start, end);

            return data.pickColumns(
                _.map(newHeader, 'title'),
                _.map(newHeader, 'patternLabel')
            );
        }, this).extend({
            rateLimit: 0
        });

        // make params for the underlying visualizer
        this.params = {
            data: this.filteredData,
            colors: colorScale,
            format: numberUtils.numberFormatter(graph.format),
            height: 500,
            id: _.kebabCase([graph.metric, graph.submetric].join('-')),
            annotations: graph.annotations,
        };
        this.params.downloadLink = graph.downloadLink;
        this.legendHeight = this.params.height - 80 + 'px';
    }

    return {
        viewModel: Visualizer,
        template: templateMarkup
    };
});
