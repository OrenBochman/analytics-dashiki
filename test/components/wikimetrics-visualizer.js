define(function (require) {
    var component = require('components/wikimetrics-visualizer/wikimetrics-visualizer'),
        $ = require('jquery'),
        api = require('apis.wikimetrics'),
        ko = require('knockout');

    var WikimetricsVisualizer = component.viewModel,
        selectedMetric,
        selectedProjects,
        visualizer,
        cohort = 'cohort',
        anotherCohort = 'another-cohort',
        cohortOption = {
            code: cohort
        },
        anotherCohortOption = {
            code: anotherCohort
        },
        v1 = 12,
        v2 = 1,
        metric = {
            name: 'RollingActiveEditor',
            submetric: 'rolling_active_editor'
        },

        deferred = $.Deferred(),

        transformedResponse = [{
            date: 1408690800000,
            label: 'cohort',
            value: v1

        }, {
            date: 1408777200000,
            label: 'cohort',
            value: v2
        }];


    describe('WikimetricsVisualizer view model', function () {

        beforeEach(function () {
            // make api.get return a mock promise, which can be resolved
            // differently in each test
            sinon.stub(api, 'getData').returns(deferred.promise());
            selectedMetric = ko.observable();
            selectedProjects = ko.observableArray();

            visualizer = new WikimetricsVisualizer({
                metric: selectedMetric,
                projects: selectedProjects,
            });
            deferred.resolveWith(this, [transformedResponse]);
        });

        afterEach(function () {
            api.getData.restore();
        });

        it('should not do anything without a selected metric', function () {

            selectedProjects(['one', 'two']);
            // nothing is fetched without a metric
            expect(visualizer.mergedData().length).toEqual(0);

            // but after a metric is set
            selectedMetric(metric);
            // promises will result in merged data being available (2 records x 2 datasets = 4):
            expect(visualizer.mergedData().length).toEqual(4);
        });

        it('should transform selected projects and metrics into merged data', function () {

            selectedMetric({
                name: 'RollingActiveEditor',
                submetric: 'rolling_active_editor'
            });
            selectedProjects.push(cohortOption);
            expect(visualizer.mergedData().length).toEqual(2);

            expect(visualizer.mergedData()[0].date).toEqual(1408690800000);
            expect(visualizer.mergedData()[0].label).toEqual(cohort);
            expect(visualizer.mergedData()[0].value).toEqual(v1);
            expect(visualizer.mergedData()[1].date).toEqual(1408777200000);
            expect(visualizer.mergedData()[1].label).toEqual(cohort);
            expect(visualizer.mergedData()[1].value).toEqual(v2);

            // change projects observable and make sure the merged data reflects it
            transformedResponse.map(function (item) {
                item.label = anotherCohort;
            });
            selectedProjects.push(anotherCohortOption);

            // this data is here from the second push (another-cohort)
            expect(visualizer.mergedData()[2].date).toEqual(1408690800000);
            expect(visualizer.mergedData()[2].label).toEqual(anotherCohort);
            expect(visualizer.mergedData()[2].value).toEqual(v1);
            expect(visualizer.mergedData()[3].date).toEqual(1408777200000);
            expect(visualizer.mergedData()[3].label).toEqual(anotherCohort);
            expect(visualizer.mergedData()[3].value).toEqual(v2);
        });
    });
});
