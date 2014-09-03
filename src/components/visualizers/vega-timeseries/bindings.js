define(['knockout', 'vega'], function (ko, vega) {

    /**
     * Utility Function.
     *
     * Parameters:
     *  from                : object to grab properties from
     *  keysWithDefaults    : an object whose keys represent the keys expected
     *                        in 'from' and values represent defaults for those keys
     * Returns:
     *  object with all the keys of 'from', unwrapped out of any knockout observables;
     *  defaults will be grabbed from 'keysWithDefaults' for undefined values
     */
    function setOrDefault(from, keysWithDefaults) {
        var to = {};
        $.extend(to, keysWithDefaults);
        $.extend(to, from);

        Object.keys(to).forEach(function (key) {
            to[key] = ko.unwrap(to[key]);
        });

        return to;
    }

    function parseValue(valueAccessor) {
        var unwrap = ko.unwrap(valueAccessor());

        // override defaults with any changed values
        return setOrDefault(unwrap, {
            data: [],
            width: 'auto',
            height: 'auto',
            parentSelector: '.parent-of-resizable',
            updateDuration: 300,
            padding: {
                top: 30,
                right: 108,
                bottom: 30,
                left: 65
            },
            strokeWidth: 2
        });
    }

    function processAutosize(value, element) {
        var autoWidth = value.width === 'auto';
        var autoHeight = value.height === 'auto';

        var newDimensions = {
            width: value.width,
            height: value.height
        };
        var p = value.padding;
        var parent = $(element).parents(value.parentSelector);

        if (autoWidth) {
            newDimensions.width = parent.innerWidth() - (p.left + p.right);
        }
        if (autoHeight) {
            newDimensions.height = parent.innerHeight() - (p.top + p.bottom);
        }
        return autoWidth || autoHeight ? newDimensions : value;
    }

    function vegaData(dataInCanonicalForm) {
        return [{
            name: 'timeseries',
            values: dataInCanonicalForm
        }];
    }

    function vegaDefinition(value) {
        return {
            width: value.width,
            height: value.height,
            padding: value.padding,
            data: vegaData(value.data),
            scales: [{
                name: 'x',
                type: 'time',
                range: 'width',
                domain: {
                    data: 'timeseries',
                    field: 'data.date'
                }
            }, {
                name: 'y',
                type: 'linear',
                range: 'height',
                nice: true,
                domain: {
                    data: 'timeseries',
                    field: 'data.value'
                }
            }, {
                name: 'color',
                type: 'ordinal',
                range: 'category10'
            }],
            axes: [{
                type: 'x',
                scale: 'x',
                tickSizeEnd: 0,
                grid: true,
                properties: {
                    ticks: {
                        stroke: {
                            value: '#666666'
                        }
                    },
                    labels: {
                        fill: {
                            value: '#666666'
                        }
                    },
                    grid: {
                        stroke: {
                            value: '#cacaca'
                        }
                    },
                    axis: {
                        stroke: {
                            value: '#666666'
                        },
                        strokeWidth: {
                            value: 2
                        }
                    }
                }
            }, {
                type: 'y',
                scale: 'y',
                grid: true,
                format: '4s',
                properties: {
                    ticks: {
                        stroke: {
                            value: '#666666'
                        }
                    },
                    labels: {
                        fill: {
                            value: '#666666'
                        }
                    },
                    grid: {
                        stroke: {
                            value: '#cacaca'
                        }
                    },
                    axis: {
                        stroke: {
                            value: '#666666'
                        },
                        strokeWidth: {
                            value: 2
                        }
                    }
                }
            }],
            marks: [{
                type: 'group',
                from: {
                    data: 'timeseries',
                    transform: [{
                        type: 'facet',
                        keys: ['data.label']
                    }]
                },
                marks: [{
                    type: 'line',
                    properties: {
                        enter: {
                            strokeWidth: {
                                value: value.strokeWidth
                            }
                        },
                        update: {
                            x: {
                                scale: 'x',
                                field: 'data.date'
                            },
                            y: {
                                scale: 'y',
                                field: 'data.value'
                            },
                            stroke: {
                                scale: 'color',
                                field: 'data.label'
                            }
                        }
                    }
                }, {
                    type: 'text',
                    from: {
                        transform: [{
                            type: 'filter',
                            test: 'index===data.length-1'
                        }]
                    },
                    properties: {
                        enter: {
                            baseline: {
                                value: 'middle'
                            }
                        },
                        update: {
                            x: {
                                scale: 'x',
                                field: 'data.date',
                                offset: 2
                            },
                            y: {
                                scale: 'y',
                                field: 'data.value'
                            },
                            fill: {
                                scale: 'color',
                                field: 'data.label'
                            },
                            text: {
                                field: 'data.label'
                            }
                        }
                    }
                }]
            }]
        };
    }

    ko.bindingHandlers.vegaTime = {
        init: function (element, valueAccessor) {
            var value = parseValue(valueAccessor);

            $(window).resize(function () {
                if (element.view) {
                    var dimensions = processAutosize(value, element);
                    if (dimensions !== value) {
                        element.view
                            .height(dimensions.height)
                            .width(dimensions.width)
                            .update({
                                duration: value.updateDuration
                            });
                    }
                }
            });
            return {
                controlsDescendantBindings: false
            };
        },
        // Parameters: element, valueAccessor, allBindings, viewModel, bindingContext
        update: function (element, valueAccessor) {
            var value = parseValue(valueAccessor);
            var dimensions = processAutosize(value, element);
            if (dimensions !== value) {
                $.extend(value, dimensions);
            }
            if (element.view) {
                var parsed = vega.parse.data(vegaData(value.data)).load;
                element.view.data(parsed).update({
                    duration: value.updateDuration
                });
            } else {
                vega.parse.spec(vegaDefinition(value), function (graph) {
                    element.view = graph({
                        el: element
                    }).update();
                    $(window).trigger('resize');
                });
            }
        }
    };

});
