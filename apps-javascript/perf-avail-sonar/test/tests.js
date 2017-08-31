
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'foo': {
                cname: 'www.foo.com'
            },
            'bar': {
                cname: 'www.bar.com'
            },
            'baz': {
                cname: 'www.baz.com'
            }
        },
        default_provider: 'foo',
        default_ttl: 20,
        availability_threshold: 80,
        //Set Fusion Sonar threshold for availability for the platform to be included.
        // sonar values are between 0 - 5
        fusion_sonar_threshold: 2
    };

    module('do_init');

    function test_do_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings || default_settings),
                config = {
                    requireProvider: this.stub()
                },
                test_stuff = {
                    instance: sut,
                    config: config
                };

            i.setup(test_stuff);

            // Test
            sut.do_init(config);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('default', test_do_init({
        setup: function() { return; },
        verify: function(i) {
            equal(i.config.requireProvider.callCount, 3, 'Verifying requireProvider call count');
            equal(i.config.requireProvider.args[2][0], 'foo', 'Verirying provider alias');
            equal(i.config.requireProvider.args[1][0], 'bar', 'Verirying provider alias');
            equal(i.config.requireProvider.args[0][0], 'baz', 'Verirying provider alias');
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings || default_settings),
                request = {
                    getData: this.stub(),
                    getProbe: this.stub()
                },
                response = {
                    respond: this.stub(),
                    setTTL: this.stub(),
                    setReasonCode: this.stub()
                },
                test_stuff = {
                    instance: sut,
                    request: request,
                    response: response
                };

            this.stub(Math, 'random');
            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('best_performing_provider', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 190
                    },
                    "bar": {
                        "http_rtt": 180
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getProbe
                .withArgs('avail')
                .returns({
                    "foo": {
                        "avail": 100
                    },
                    "bar": {
                        "avail": 100
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "bar": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "baz": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));
    
    test('all_providers_eliminated', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 190
                    },
                    "bar": {
                        "http_rtt": 180
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getProbe
                .withArgs('avail')
                .returns({
                    "foo": {
                        "avail": 70
                    },
                    "bar": {
                        "avail": 90
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "bar": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 0
                        },
                        "bypass_data_points": true
                    }),
                    "baz": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 0
                        },
                        "bypass_data_points": true
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));
    
    test('data_problem - 1', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({});
            i.request
                .getProbe
                .withArgs('avail')
                .returns({
                    "foo": {
                        "avail": 70
                    },
                    "bar": {
                        "avail": 90
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "bar": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 0
                        },
                        "bypass_data_points": true
                    }),
                    "baz": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 0
                        },
                        "bypass_data_points": true
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));
    
    test('data_problem - 2', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 190
                    },
                    "bar": {
                        "http_rtt": 180
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getProbe
                .withArgs('avail')
                .returns({});
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "bar": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 0
                        },
                        "bypass_data_points": true
                    }),
                    "baz": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 0
                        },
                        "bypass_data_points": true
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));
    
    test('data_problem - 3', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 190
                    },
                    "bar": {
                        "http_rtt": 180
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getProbe
                .withArgs('avail')
                .returns({
                    "foo": {
                        "avail": 70
                    },
                    "bar": {
                        "avail": 90
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({});
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));
    
    test('data_problem - 4', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 190
                    },
                    "bar": {
                        "http_rtt": 180
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getProbe
                .withArgs('avail')
                .returns({
                    "foo": {
                        "avail": 70
                    },
                    "bar": {
                        "avail": 90
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true,
                        "availability_override": true
                    }),
                    "bar": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 0
                        },
                        "bypass_data_points": true,
                        "availability_override": true
                    }),
                    "baz": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 0
                        },
                        "bypass_data_points": true,
                        "availability_override": true
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));

    test('test-excep_country1', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0,
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0,
                    except_country: ['RS']
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0,
                    except_country: ['RS']
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0,
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 201 },
                bar: { http_rtt: 201 },
                baz: { http_rtt: 201 },
                qux: { http_rtt: 200 }
            });
            i.request.country = 'RS';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'qux', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.qux.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));
}());
