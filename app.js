(function () {

	var app = angular.module('ngKanban', ['ui.bootstrap', 'ui.select']);

	app.value('globals', {});

	app.controller('appController', [
		'globals', '$rootScope', '$scope', '$timeout', 'storageService', 'usersService', 'notificationService', '$uibModal',
		function (globals, $rootScope, $scope, $timeout, storageService, usersService, notificationService, $uibModal) {

			var ac = this;

			ac.user = null;
			ac.showRegister = ac.user == null;
			ac.showLogin = ac.user == null;
			ac.showLogout = ac.user != null;
			ac.searchTerm = '';

			$('body').on('mouseover', '.media', function () {
				$(this).addClass('bg-info');
			});
			
			$('body').on('mouseout', '.media', function () {
				$(this).removeClass('bg-info');
			});
			
			firebase.auth().onAuthStateChanged(function (user) {

				$timeout(function () {
					$scope.$apply(function () {
						ac.setUser(user);
					});
				}, 100);

			});

			$scope.$on('profile-updated', function (event, user) {
				$timeout(function () {
					$scope.$apply(function () {
						ac.setUser(user);
					});
				}, 100);
			});

			ac.setUser = function (user) {

				globals.user = user;

				ac.user = user;
				ac.showRegister = ac.user == null;
				ac.showLogin = ac.user == null;
				ac.showLogout = ac.user != null;

				if (user) {
					storageService.subscribeToListUpdates();
				}

				$rootScope.$broadcast('user-updated');
			}

			ac.register = function () {

				var modalInstance = $uibModal.open({
					templateUrl: 'registerModal.html',
					controller: 'registerModalController',
					controllerAs: 'rm',
					resolve: {
						mode: function () {
							return 'register';
						}
					}
				});

				modalInstance.result.then(
					function (newUser) {
						usersService.createAccount(newUser);
					},
					function () {
						// cancelled
					}
				);
			};

			ac.login = function () {

				var modalInstance = $uibModal.open({
					templateUrl: 'registerModal.html',
					controller: 'registerModalController',
					controllerAs: 'rm',
					resolve: {
						mode: function () {
							return 'login';
						}
					}
				});

				modalInstance.result.then(
					function (user) {
						usersService.authorizeAccount(user);
					},
					function () {
						// cancelled
					}
				);
			};

			ac.logout = function () {

				usersService.exitAccount();
			};

			ac.showMyStories = function () {

				var modalInstance = $uibModal.open({
					templateUrl: 'searchResultsModal.html',
					controller: 'searchResultsController',
					controllerAs: 'rm',
					resolve: {
						results: function () {
							return globals.user.stories;
						},
						term: function () {
							return null;
						}
					}
				});

				modalInstance.result.then(
					function (story) {
						$rootScope.$broadcast('edit-story', story);
					},
					function () {
						// cancelled
					}
				);
			};

			ac.search = function () {

				storageService.findStories(ac.searchTerm).then(
					function (results) {

						var modalInstance = $uibModal.open({
							templateUrl: 'searchResultsModal.html',
							controller: 'searchResultsController',
							controllerAs: 'rm',
							resolve: {
								results: function () {
									return results.map(function (item) {
										return Object.assign({}, item);
									});
								},
								term: function () {
									return ac.searchTerm
								}
							}
						});

						modalInstance.result.then(
							function (story) {
								$rootScope.$broadcast('edit-story', story);
							},
							function () {
								// cancelled
							}
						);

					}
				);
			};

		}]);

	app.controller('registerModalController', ['$uibModalInstance', 'mode', function ($uibModalInstance, mode) {

		var rm = this;

		rm.errors = [];
		rm.mode = mode;

		rm.user = {
			id: '',
			name: '',
			email: '',
			password: ''
		};

		rm.register = function () {

			rm.errors = [];

			if (rm.user.name === '') {
				rm.errors.push('A name is required.');
			}

			if (rm.user.email === '') {
				rm.errors.push('An email address is required.');
			}

			if (rm.user.password === '') {
				rm.errors.push('A password is required.');
			}

			if (rm.errors.length < 1) {
				$uibModalInstance.close(rm.user);
			}
		};

		rm.login = function () {

			rm.errors = [];

			if (rm.user.email === '') {
				rm.errors.push('An email address is required.');
			}

			if (rm.user.password === '') {
				rm.errors.push('A password is required.');
			}

			if (rm.errors.length < 1) {
				$uibModalInstance.close(rm.user);
			}
		}

		rm.cancel = function () {
			$uibModalInstance.dismiss('cancel');
		};
	}]);

	app.controller('searchResultsController', ['$sce', '$uibModalInstance', 'results', 'term', function ($sce, $uibModalInstance, results, term) {

		var rm = this;

		rm.mode = term ? 'search' : 'assignments';
		
		rm.results = results.map(function (item) {

			var resultItem = angular.copy(item);

			resultItem.summary = $sce.trustAsHtml(markTerms(item.summary, term));
			resultItem.detail = $sce.trustAsHtml(markTerms(item.detail, term));

			return resultItem;
		});

		rm.edit = function (storyId) {

			var story = results.find(function (item) {
				return item.id === storyId;
			});

			$uibModalInstance.close(story);
		};

		rm.cancel = function () {
			$uibModalInstance.dismiss('cancel');
		};

		function markTerms(text, term) {

			if (!term) {
				return text;
			}		
			
			var result = [];
			var buffer = [];
			var queue = text.split('');

			term = term.toLowerCase();

			while (queue.length) {

				buffer.push(queue.shift());

				if (buffer.length === term.length) {

					var word = buffer.join('');

					if (word.toLowerCase() === term) {
						result.push('<mark>' + word + '</mark>');
						buffer = [];
					}
					else {
						result.push(buffer.shift());
					}
				}
			}

			return result.join('') + buffer.join('');
		}

	}]);


})();
