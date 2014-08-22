define(['components/wikimetrics-layout/wikimetrics-layout'], function(component) {
    var WikimetricsLayout = component.viewModel;


    describe('WikimetricsLayout view model', function() {

        it('should create a loading observable', function() {
            var layout = new WikimetricsLayout();

            expect(typeof(layout.loading)).toEqual('function');
        });
    });
});
