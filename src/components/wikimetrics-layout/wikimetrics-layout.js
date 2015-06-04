define(function (require) {
    'use strict';

    var ko = require('knockout'),
        _ = require('lodash'),
        wikimetricsApi = require('apis.wikimetrics'),
        configApi = require('apis.config'),
        stateManagerFactory = require('stateManager'),
        templateMarkup = require('text!./wikimetrics-layout.html');

    function WikimetricsLayout() {
        var self = this;

        // project and language observables
        self.selectedProjects = ko.observableArray([]);
        self.projectOptions = ko.observable([]);
        self.languageOptions = ko.observable([]);
        self.defaultProjects = ko.observable([]);
        self.reverseLookup = ko.observable();

        // metric observables
        self.selectedMetric = ko.observable();
        self.defaultMetrics = ko.observable([]);
        self.metricFilter = ko.observable([]);
        self.allMetrics = ko.observable([]);
        self.metrics = ko.computed(function () {
            var filter = ko.unwrap(this.metricFilter),
                all = ko.unwrap(this.allMetrics);

            return _.map(all, function (category) {
                if (filter) {
                    category.metrics = _.filter(category.metrics, function (m) {
                        return _.includes(filter, m.name);
                    });
                }
                return category;
            });

        }, this);

        // Eagerly fetching the available projects to display in the project-selector
        wikimetricsApi.getProjectAndLanguageChoices(function (config) {
            self.languageOptions(config.languageOptions);
            self.projectOptions(config.projectOptions);
            self.reverseLookup(config.reverseLookup);
        });

        configApi.getDefaultDashboard(function (config) {
            if (config.metrics) {
                self.metricFilter(config.metrics);
            }
        });

        // state manager should be observing the selections of project and metric
        // returns a statemanager obj if you need it
        stateManagerFactory.getManager(this.selectedProjects, this.selectedMetric,
            this.defaultProjects, this.defaultMetrics);

        configApi.getCategorizedMetrics(function (config) {
            if (config.categorizedMetrics) {
                config.categorizedMetrics.forEach(function (category) {
                    if (!category.metrics) {
                        return;
                    }
                    category.metrics.forEach(function (metric) {
                        // whether the metric was configured to be broken down
                        metric.breakdown = metric.breakdown || false;
                        // whether to graph the available breakdowns
                        metric.showBreakdown = ko.observable(false);
                    });
                });
            }
            self.allMetrics(config.categorizedMetrics);
        });
    }

    return {
        viewModel: WikimetricsLayout,
        template: templateMarkup
    };
});
