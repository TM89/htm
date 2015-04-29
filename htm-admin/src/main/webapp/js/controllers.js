(function(){
'use strict';

	angular.module('htm.welcome', [])

		.controller('WelcomeCtrl', ['$scope', function($scope) {
		}]);

	angular.module('htm.tournament', ['htm.api'])

		.controller('TournamentListCtrl', ['$scope', 'Tournament', function($scope, Tournament) {
			$scope.tournaments = Tournament.query();

			$scope.tournaments.$promise.then(function(tournaments){
				$scope.newTournament.reset();
			},function(error){
				$scope.tournaments.error = error;
			});

			/* New tournament form is initially hidden */
			$scope.addNewTournamentVisible = false;
			$scope.focusOnAddTournament = false;

			$scope.isLoading = function(){
				return !$scope.tournaments.$resolved;
			};
			
			$scope.isError = function(){
				return $scope.tournaments.$resolved && angular.isDefined($scope.tournaments.error);
			};

			$scope.isLoaded = function(){
				return $scope.tournaments.$resolved && angular.isUndefined($scope.tournaments.error);
			};
			
			$scope.showAddNewTournament = function(){
				$scope.addNewTournamentVisible = true;
				$scope.focusOnAddTournament = false;
			};

			$scope.hideAddNewTournament = function(){
				$scope.addNewTournamentVisible = false;
				$scope.focusOnAddTournament = true;
			};

			$scope._findTournamentWithSameName = function(newTournament){
				return _.find($scope.tournaments, function(existingTournament){ 
					return existingTournament.name === newTournament.name; 
				});
			};

			$scope.newTournament = {
				_defaultName : 'Basic Longsword Tournament',
				name: '',
				memo: undefined,

				customMemo: false,
				error: undefined,

				updateMemo: function(memo){
					if(angular.isDefined(memo)){
						this.memo = memo;
						this.customMemo = true;
					}

					// Reset memo when not custom or undefined
					if(!this.customMemo && angular.isUndefined(memo)){
						this.memo = this._defaultMemo();
					}
					return this.memo;
				},

				_defaultMemo: function() {
					var memo = '';
					var name = this.name || '';

					angular.forEach(name.toUpperCase().split(' '), function(s) {
						if(isNaN(s)){
							memo += s.charAt(0);
						} else {
							memo += s;
						}
					});
					return memo;
				},

				_generateUniqueName: function(){
					var i = 2;
					while($scope._findTournamentWithSameName(this)){
						this.name =  this._defaultName + " " + i++;
					}
				},

				reset: function() {
					this.name = this._defaultName;
					this.customIdentifier = false;
					this._identifier = undefined;
					this.customMemo = false;
					this.memo = undefined;
					this.error = undefined;
					this._generateUniqueName();
					this.updateMemo();
				}
			};
			$scope.newTournament.reset();

			$scope.save = function() {
				var t = $scope.newTournament;
				var tournament = new Tournament({
					name: t.name,
					memo: t.updateMemo(),
					participants: []
				});

				tournament.$save().then(function(savedTournament){
					$scope.tournaments.push(savedTournament);
					$scope.newTournament.reset();
					$scope.hideAddNewTournament();
				},function(error){
					$scope.newTournament.error = error;
				});					
			};
		}])
		.controller('FighterEditCtrl', ['$scope', '$modalInstance', 'tournament', 'fight', 'fighter', 
			function($scope, $modalInstance, tournament,fight,fighter) {
				
				$scope.fromFightTabActive = angular.isDefined(fighter.winnerOf) || angular.isDefined(fighter.loserOf);
				$scope.fromParticipantTabActive = angular.isDefined(fighter.particpant);
				$scope.fromPoolTabActive = angular.isDefined(fighter.pool);

				$scope.tournament = tournament;
				$scope.fight = angular.copy(fight);

				if(fighter === fight.fighterA){
					$scope.fighter = $scope.fight.fighterA
				} else if(fighter === fight.fighterB){
					$scope.fighter = $scope.fight.fighterB
				} else {
					$scope.fighter = fighter;
				}

				$scope.save = function() {
					$scope.fight.$save(function(savedFight){
						$modalInstance.close(angular.copy(savedFight,fight));
					},function(error){
						//TODO: Handle error.
					});
				};

				$scope.cancel = function() {
					$modalInstance.dismiss('cancel');
				};



				$scope.getPotentialPrecursors = function(){

					if(fight.isElimination()){

						var phaseIdx = _.findIndex($scope.tournament.phases,function(phase){
							return $scope.fight.phase === phase.id && $scope.fight.phaseType === phase.phaseType;
						});

						var precursorPhases = _.filter($scope.tournament.phases.slice(0,phaseIdx + 1), function(phase){
							return phase.isElimination();
						});

						var precursorFights = _.flatten(_.pluck(precursorPhases,'fights'));

						return _.reject(precursorFights, function(fight){
							return fight.equals($scope.fight);
						});
					}

					if(fight.isFreestyle()){
						var phase = _.findWhere($scope.tournament.phases, {
							id:$scope.fight.phase,
							phaseType:$scope.fight.phaseType
						})

						return phase.fights;
					}

					return [];

				};

				$scope.getPotentialParticipants = function(){
					return $scope.tournament.participants;
				};

				$scope.setWinner = function(fight){
					$scope.fighter.winnerOf = fight.id;
					$scope.fighter.loserOf = undefined;
					$scope.fighter.particpant = undefined;
					$scope.fighter.pool = undefined;
					$scope.fighter.rank = undefined;

				};

				$scope.setLoser = function(fight){
					$scope.fighter.winnerOf = undefined;
					$scope.fighter.loserOf =  fight.id;
					$scope.fighter.participant = undefined;
					$scope.fighter.pool = undefined;
					$scope.fighter.rank = undefined;
				};		

				$scope.setParticipant = function(participant){
					$scope.fighter.winnerOf = undefined;
					$scope.fighter.loserOf =  undefined;
					$scope.fighter.participant = participant.id;
					$scope.fighter.pool = undefined;
					$scope.fighter.rank = undefined;
				};

				$scope.setPoolRank = function(pool, rank){
					$scope.fighter.winnerOf = undefined;
					$scope.fighter.loserOf =  undefined;
					$scope.fighter.participant = undefined;
					$scope.fighter.pool = pool.id;
					$scope.fighter.rank = rank;
				};

				$scope.isWinnerOf = function(fight){
					return $scope.fighter.winnerOf === fight.id;
				}
				$scope.isLoserOf = function(fight){
					return $scope.fighter.loserOf === fight.id;
				}

				$scope.isParticipant = function(participant){
					return $scope.fighter.participant === participant.id;
				}


				$scope.isPoolRank = function(pool,rank){
					return $scope.fighter.pool === pool.id && $scope.fighter.rank === rank;	
				}

		}])

		.controller('TournamentCtrl', ['$scope', '$routeParams', '$modal','Tournament', 'Participant', 'Fight','Phase',
			function($scope, $routeParams, $modal, Tournament, Participant, Fight, Phase) {
				$scope.tournament = Tournament.get({id:$routeParams.tournamentId});
				$scope.participants = []; 
				$scope.newPartipcant = {}; 

				$scope.searchParticipants = function(query){
					var searchCriteria = {
						page:0,
						items:15,
						query:query,
					};

					Participant.query(searchCriteria).$promise.then(function(participants){
						$scope.participants = _.filter(participants,function(participant){
							return !$scope.tournament.isSubscribed(participant);
						}); 
					});
				}

				$scope.addParticipant = function(participant){

					if($scope.tournament.isSubscribed(participant)){
						//TODO: Handle error
						return;
					}

					$scope.tournament.subscribe(participant).then(function(subscription){
						// Clear search result and remove 
						// subscribed participant from the result list
						$scope.newPartipcant = {};
						$scope.participants = _.filter($scope.participants, function(oldParticipant){
							return oldParticipant.id !== participant.id;
						});
					},function(error){
						//TODO: Handle error
					});
				}

				$scope.addFight = function(freestylePhase){
					return $scope.tournament.addFight(freestylePhase).catch(function(error){
						//TODO: Handle error
					});
				};

				$scope.showElimination = function(){

					$modal.open({
					  templateUrl: '/partials/tournament-generate-elimination.html',
					  controller: 'TournamentGenerateEliminationCtrl',
					  size: 'sm',
					  resolve: {
					    tournament: function() {
					      return $scope.tournament.$promise;
					    }
					  }
					})	
				}

				$scope.showPools = function(){

					$modal.open({
					  templateUrl: '/partials/tournament-generate-pools.html',
					  controller: 'TournamentGeneratePoolsCtrl',
					  size: 'sm',
					  resolve: {
					    tournament: function() {
					      return $scope.tournament.$promise;
					    }
					  }
					})	
				}
		}])


		.controller('TournamentGenerateEliminationCtrl',['$scope', '$modalInstance', 'tournament',
			function($scope, $modalInstance, tournament) {

				$scope.generate = function(n){
					tournament.$generateElimination({n:n}).then(function(updatedTournament){
						$modalInstance.close(updatedTournament);
					}, function(error){	
						//TODO: Handle error
					});
				}
		}])

		.controller('TournamentGeneratePoolsCtrl',['$scope', '$modalInstance', 'tournament',
			function($scope, $modalInstance, tournament) {

				$scope.tournament = tournament
				$scope.maxParticipantsPerPool = tournament.participants.length;
				$scope.participantsPerPool = Math.ceil(tournament.participants.length / 8)

				$scope.generate = function(n){
					tournament.$generatePools({n:$scope.participantsPerPool}).then(function(updatedTournament){
						$modalInstance.close(updatedTournament);
					}, function(error){	
						//TODO: Handle error
					});
				}
		}])

		;

	angular.module('htm.particpant', [])

		.controller('ParticipantListCtrl', ['$scope', '$modal','$routeParams','Tournament','Participant','Statistics',
			function($scope,$modal,$routeParams,Tournament, Participant,Statistics) {
		
				var pages = [];

				$scope.searchCriteria = {
					page:0,
					items:15,
					query:undefined,
				};

				pages[0] = Participant.query($scope.searchCriteria);

				$scope.totals = Statistics.get();
				$scope.tournaments = Tournament.query();
				$scope.modalOpen = false;

				function _refresh(){
					$scope.searchCriteria.page = 0;
					Participant.query($scope.searchCriteria).$promise.then(function(freshParticipants){
						pages = [];
						pages[0] = freshParticipants;
					}, function(error){
						//TODO: Handle error
					});
				}

				var debouncedRefresh = _.debounce(_refresh, 250);

				$scope.refresh = function($event){
					if(event.keyCode === 13){
						registerSingleSelected();
					} else {
						debouncedRefresh();
					}
				};

				$scope.more = function(){

					var newPage = ++$scope.searchCriteria.page;

					Participant.query($scope.searchCriteria)
						.$promise.then(function(freshParticipants){
							pages[newPage] = freshParticipants;
						});
				};

				$scope.participants = function(){
					return _.flatten(pages);
				};

				function registerSingleSelected(){

					var participants = $scope.participants();
					
					if(participants.length === 1){
						var participant = participants[0];
						participant.isPresent = true;
						participant.$save();
					}
				}

				$scope.registerSelected = function(){
					angular.forEach($scope.participants(), function(participant){
						participant.isPresent = true;
						participant.$save();

					});
				};

				$scope.unregisterSelected = function(){
					angular.forEach($scope.participants(), function(participant){
						participant.isPresent = false;
						participant.$save();

					});
				};


				/*
				 * Opens modal with the particpant and tournament promises
				 * this will delay opening of modal until they are resolved.
				 */
				function openModal(participant) {
					$scope.modalOpen=true;
					
					return $modal.open({
					  templateUrl: '/partials/participant-registration.html',
					  controller: 'ParticipantRegistrationCtrl',
					  size: 'lg',
					  resolve: {
					    participant: function () {
					      return participant;
					    },
					    tournaments: function() {
					      return $scope.tournaments.$promise;
					    }
					  }
					}).result;				
				}

			  	$scope.add = function(){
			  		openModal().then(function(newParticipant) {
			  				pages[0].unshift(newParticipant);
							$scope.totals = Statistics.get();
			  			}).finally(function(){
							$scope.modalOpen=false;
			  			});
				};



	  			$scope.show = function(participant){
	  				openModal(participant).finally(function(){
						$scope.modalOpen=false;
		  			});
	  			};

	  			/*
				 * Opens modal when particpants are viewed through /participant/:id
	   			 */
				if($routeParams.participantId){
					var participant = Participant.get({id:$routeParams.participantId});
					openModal(participant.$promise).then(function(updatedParticipant){
						participants[updatedParticipant.id] = updatedParticipant;
					}).finally(function(){
						$scope.modalOpen=false;
		  			});
				}

		}])

		.controller('ParticipantRegistrationCtrl',['$scope', '$modalInstance', 'Country', 'Participant', 'Club', 'participant', 'tournaments',
			function($scope, $modalInstance, Country, Participant, Club, participant, tournaments) {

			$scope.pictures = {files:[]};
			$scope.participant = angular.copy(participant) || new Participant({club: {}, isPresent: false, previousWins: [], subscriptions: [], hasPicture: false });
			$scope.tournaments = _.filter(tournaments,function(tournament){
				return !_.find($scope.participant.subscriptions,function(subscription){
					return subscription.tournament.id === tournament.id;
				});
			});
			$scope.countries = Country.query();
			$scope.clubs = Club.query();

			$scope.addNewClubVisible = false;

			$scope.showAddNewClub = function(){
				$scope.oldClub = angular.copy($scope.participant.club);
				//Clean by individual property names so watchers see the update				
				$scope.participant.club.id = undefined;
				$scope.participant.club.name = undefined;
				$scope.participant.club.code = undefined;
				$scope.addNewClubVisible = true;
			};

			$scope.hideAddNewClub = function(){
				$scope.addNewClubVisible = false;
				//Restore by individual property names so watchers see the update
				$scope.participant.club.id = $scope.oldClub.id;
				$scope.participant.club.name = $scope.oldClub.name;
				$scope.participant.club.code = $scope.oldClub.code;
			};

			$scope.addWin = function() {
				if ($scope.canAddWin()) {
				  $scope.participant.previousWins.push({text: ''});
				}
			};

			$scope.canAddWin = function() {
				return $scope.participant.previousWins.length < 3;
			};

			$scope.removeWin = function(win) {
				$scope.participant.previousWins = _($scope.participant.previousWins).filter(function(item) {
   					  return item !== win;
				});
			};

			$scope.save = function() {

				$scope.participant.$save(function(savedParticipant){
					$modalInstance.close(angular.copy(savedParticipant,participant));
				},function(error){
					//TODO: Handle error.
				});
			};

			$scope.checkin = function() {
				$scope.participant.isPresent = true;
				$scope.save();
			};

			$scope.cancel = function() {
				$modalInstance.dismiss('cancel');
			};

			$scope.upload = function(pictures){
				var picture = new Participant({id:$scope.participant.id,file:pictures[0]});
				picture.$postPicture().then(function(participant){
					$scope.participant.id = participant.id;
					$scope.participant.hasPicture = participant.hasPicture;
				},function(error){
					// TODO: Handle error
				});
			};


		}])
	;



	

})();