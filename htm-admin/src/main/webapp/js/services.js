(function(){
	'use strict';

	/* Services */
	
	var api  = '/api/v3/';

	angular.module('htm.api', ['ngResource'])
	
		.factory('Tournament', ['$resource', function($resource){
			var Tournament = $resource(api + 'tournament/:id', { "id" : "@id" },{

					get: { 
						method: 'GET',
						transformResponse: function(Tournament){
							    


							    return Tournament;
						},
						headers:{'Content-Type': undefined}
					}});

			Tournament.prototype.getFights = function(fightIds){
				return _.filter(this.fights, function(fight){
					return _.contains(fightIds,fight.id);
				});
			};

			Tournament.prototype.getFightName = function(fightId){
					if(angular.isUndefined(fightId)){
						return ''
					}

					var fight =  _.find(this.fights, function(fight){
						return fight.id === fightId;
					});

					var phase = _.find(this.phases, function(phase){
						return phase.id === fight.phase;
					});

					if(angular.isUndefined(phase.pools)){
						return phase.name + " - " + fight.name;
					}

					var pool = _.find(phase.pools, function(pool){
						return _.contains(pool.fights,fight.id);
					});

					return phase.name + " - " + pool.name + " " + fight.name ;
			};
			
			Tournament.prototype.getParticipant = function(participantId){
				return _.find(this.participants, function(participant){
					return participant.id === participantId;
				});
			};

			return Tournament			

		}])
		.factory('Fight', ['$resource', function($resource) {
			return $resource(api + 'tournament/:id/fight/:fightId', { "id" : "@id", "fightId":"@fightId" });
		}])		
		.factory('Fighter', ['$resource', function($resource) {
			return $resource(api + 'tournament/:id/fighter/:fighterNumber', { "id" : "@id", "fighterNumber":"@fighterNumber" });
		}])
		.factory('Phase', ['$resource', function($resource) {
			return $resource(api + 'tournament/:id/phase', { "id" : "@id"});
		}])
		.factory('Participant', ['$resource', function($resource){
			var Participant = $resource(api + 'participant/:id', { "id" : "@id" }, 
				{ 
					update: { method: 'PUT' },
					postPicture: { 
						method: 'POST',
						params:{},
						url: api+'participant/picture/:id',
						transformRequest: function(data){
							    var fd = new FormData();
							   	fd.append('file',data.file);
							    return fd;
						},
						headers:{'Content-Type': undefined}
					}
				}
			);

		  	Participant.prototype.hasDetails = function(participant) {
		    	return this.age || this.height || this.weight;
  			};

		  	Participant.prototype.getSubscription = function(tournamentId) {
		    	return _.find(this.subscriptions,function(subscription){
		    		return subscription.tournament === tournamentId;
		    	});
  			};

  			return Participant;
		}])

		.factory('Country', ['$resource', function($resource) {
  			return $resource(api + 'country');
		}])

		.factory('Club', ['$resource', function($resource) {
  			return $resource(api + 'club');
		}])

		.factory('Statistics', ['$resource', function($resource) {
  			return $resource(api+'participant/totals');
		}])

		;

})();