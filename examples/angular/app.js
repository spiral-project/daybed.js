var wishlistApp = angular.module('wishlistApp', ['ngRoute']);


wishlistApp.config(function ($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl: '_home.html',
        controller: 'HomeCtrl'
    })
    .when('/:id', {
        templateUrl: '_main.html',
        controller: 'MainCtrl'
    });
});


wishlistApp.controller('HomeCtrl', function ($scope, $location, $routeParams, wishlistData) {

    wishlistData
        .fetch()
        .thenApply(function(response) {
            $scope.wishlists = response.records;
        });

    $scope.create = function () {
        var record = {
            name: $scope.name || '',
            items: []
        };
        wishlistData
            .save(record)
            .thenApply(function(response) {
                var adminToken = wishlistData.token();
                $location.url('/' + response.id + '?token=' + adminToken);
            });
    };
});


wishlistApp.controller('MainCtrl', function ($scope, $location, $routeParams, wishlistData) {

    var adminToken = $location.search().token;

    $scope.wish = {};
    $scope.readonly = !adminToken;
    $scope.urls = {
        admin: $location.absUrl(),
        share: $location.absUrl().replace(/\?token=.+/, '')
    };

    $scope.defaultphoto = '//upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Giving_a_gift.jpg/320px-Giving_a_gift.jpg';

    // Retrieve wishlist by id
    wishlistData
        .token(adminToken)
        .get($routeParams.id)
        .thenApply(function(response) {
            $scope.master = response;
        },
        function (e) {
            // Redirect to Home if wishlist unknown
            if (e.status == 404) {
                $location.url('/');
            }
        });


    $scope.deleteWishlist = function () {
        if (window.confirm("Do you really want to delete this wishlist?")) {
            wishlistData
                .delete($scope.master.id)
                .thenApply(function() {
                    $location.url('/');
                });
        }
    };

    $scope.addWish = function () {
        var wish = angular.copy($scope.wish);
        wish.date = new Date().toISOString();

        $scope.master.items.push(wish);
        save();
        $scope.wish = {};
    };

    $scope.deleteWish = function (index) {
        $scope.master.items.splice(index, 1);
        save();
    };

    function save() {
        $scope.loading = true;

        var wishlist = angular.copy($scope.master);
        wishlistData
            .save(wishlist)
            .thenApply(function () {
                $scope.loading = false;
            },
            function(error) {
                $scope.error = error;
            });
    }
});


wishlistApp.factory('wishlistData', function($rootScope) {

    // In this provider, we don't use $http, since we demo the integration
    // of daybed.js with Angular.
    // Hence, we don't benefit of Angular automatic dirty checking done here:
    // https://github.com/angular/angular.js/blob/v1.2.26/src/ng/http.js#L1012-L1013
    //
    // This piece of code uses ``$rootScope`` from closure, and forces dirty checking
    // when the *daybed.js* promises are resolved/rejected.
    var thenApply = function (onFulfilled, onRejected) {
        this.then(applied(onFulfilled), applied(onRejected));

        function applied(cb) {
            if (!cb) return cb;
            return function () {
                var args = arguments;
                $rootScope.$apply(function() {
                    cb.apply(this, args);
                });
            };
        }
    };


    var server = 'https://daybed.io';
    var model = 'daybed:examples:wishlist';

    var _sessionPromise;
    var _token;

    function session(anonymous) {
        var p;
        if (anonymous) {
            p = Daybed.startSession(server, {anonymous: true});
        }
        else {
            // Reuse promise once authenticated
            p = _sessionPromise || Daybed.startSession(server, {token: _token});
        }
        // Either native Promise or promise-polyfill
        p.constructor.prototype.thenApply = thenApply;
        return p;
    }

    return {
        token: function (token) {
            if (arguments.length == 1) {
                _token = token;
                return this;
            }
            return _token;
        },

        fetch: function () {
            return session(true)
                .then(function (session) {
                    return session.getRecords(model);
                })
                .catch(function (e) {
                    if (e.status == 404) {
                        // Install model automatically (once per server)
                        return install();
                    }
                });
        },

        get: function (id) {
            return session(true)
                .then(function (session) {
                    return session.getRecord(model, id);
                });
        },

        delete: function (id) {
            return session()
                .then(function (session) {
                    return session.deleteRecord(model, id);
                });
        },

        save: function (wishlist) {
            return session()
                .then(function (session) {
                    if (session.token != _token)
                        _token = session.token;
                    return session.saveRecord(model, wishlist);
                });
        }
    };


    function install () {
        var wishlistModel = {
            definition: {
                title: 'Daybed Wishlist',
                description: 'Daybed + Angular',
                fields : [
                    {name: 'name', type: 'string'},
                    {name: 'items', type: 'list',
                     item: {
                     type: 'object',
                     fields: [
                         {name: 'title', type: 'string'},
                         {name: 'details', type: 'text'},
                         {name: 'photo', type: 'url'}
                     ]}}
                ],
            },
            permissions: {
                'Everyone': [
                    'read_definition', 'create_record', 'read_all_records',
                    'update_own_records', 'delete_own_records',
                ]
            }
        };

        Daybed.startSession(server)
            .then(function (session) {
                console.log('Model admin token:', session.token);
                return session.saveModel(model, wishlistModel);
            });
    }
});


wishlistApp.directive('selectOnClick', function () {
    // Select input field content on focus
    // Source: http://stackoverflow.com/a/14996261/141895
    return function (scope, element, attrs) {
        element.bind('click', function () {
            this.select();
        });
    };
 });
