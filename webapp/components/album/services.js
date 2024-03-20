(function() {
    'use-strict';
    
    angular.module("cddb4client").factory("albumService", ["$resource", AlbumService]);    
           
    function AlbumService($resource){
        return $resource("/cddb/rest/:id", { id: "@id"},
            {
                'update': { method: 'put'}
            }, 
            {stripTrailingSlashes: false});
    };
    
    angular.module("cddb4client").factory("trackService", ["$resource", TrackService]);    
           
    function TrackService($resource){
        return $resource("/cddb/rest/:albumid/tracks/:trackid",
            {
                albumid: "@albumid",
                trackid: "@trackid"
            },
            {
                'update': { method: 'put'}
            }, 
            {stripTrailingSlashes: false});
    };
})();