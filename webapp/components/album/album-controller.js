(function() {
    'use-strict';
    
    angular.module("cddb4client").controller("AlbumController", ['$scope', 'albumService', 'trackService', AlbumController]);

    function AlbumController($scope, albumService, trackService){
        var self = this;
        self.albums = [];
        self.currentAlbum = {id:null, artist:"", name:"", year:null, tracks:null};
        self.currentTrack = {trackid:null, tracknr:null, name:""};
        
        self.albumToString = function(album) {return "\""+album.name+" ("+album.year+") by "+album.artist+"\"";};
        self.trackToString = function(track) {return "\""+track.tracknr+". "+track.name+"\"";};
        
        //----------------------------------------------------------------------
        //View functionality for albums
        //----------------------------------------------------------------------

        self.selectAlbum = function(id){
            console.log("Selected album "+id);
            for(var i = 0; i < self.albums.length; i++){
                if(self.albums[i].id === id) {
                   self.currentAlbum = angular.copy(self.albums[i]);
                   self.fetchAllTracks();
                   self.clearTrackForm();
                   break;
                }
            }            
        };

        self.submitAlbum = function(){
            if(self.currentAlbum.id===null){
                console.log("New album submitted: "+self.albumToString(self.currentAlbum));
                self.createAlbum(self.currentAlbum); //CREATE
            } else {
                console.log("Album "+self.currentAlbum.id+" updated: "+self.albumToString(self.currentAlbum));
                self.updateAlbum(self.currentAlbum); //UPDATE
            }
            self.clearAlbumForm();
        };

        self.deleteAlbum = function(){
            console.log("Deleting album "+self.currentAlbum.id);
            self.removeAlbum(self.currentAlbum);
            self.clearAlbumForm();
        };

        self.clearAlbumForm = function(){
            console.log("Clearing albumForm");
            self.currentAlbum = {id:null, artist:"", name:"", year:null};
            $scope.albumForm.$setPristine();
        };

        self.resetFilter = function(){
            console.log("Resetting albumFilter");
            $scope.query = "";
        };
        
        //----------------------------------------------------------------------
        //CRUD functions that call on albumService
        //----------------------------------------------------------------------
        
        self.fetchAllAlbums = function(){
            albumService.query(function(response){
                console.log("Fetching all albums from database");
                self.albums = response;                
            });
        };
        
        self.fetchAllAlbums();//called when controller first loads to populate the albumlist
        
        self.createAlbum = function(albumVar){
            albumService.save(albumVar, function(){
                console.log("New album saved in database");
                
                self.fetchAllAlbums();
            });
        };
        
        self.updateAlbum = function(albumVar){
            var service = new albumService();
            service.id = albumVar.id;
            service.artist = albumVar.artist;
            service.name = albumVar.name;
            service.year = albumVar.year;
            service.$update(function(){
                console.log("Album "+albumVar.id+" updated in database");
                self.fetchAllAlbums();
            });
        };
        
        self.removeAlbum = function(albumVar){
            var service = new albumService();
            service.id = albumVar.id;
            service.$delete(function(){
                console.log("Album "+albumVar.id+" removed from database");
                self.fetchAllAlbums();
            });
        };
        
        //----------------------------------------------------------------------
        //View functionality for tracks
        //----------------------------------------------------------------------
        
        self.selectTrack = function(id){
            console.log("Selected track "+id+" (trackid, not tracknr)");
            for(var i = 0; i < self.currentAlbum.tracks.length; i++){
                if(self.currentAlbum.tracks[i].trackid === id) {
                   self.currentTrack = angular.copy(self.currentAlbum.tracks[i]);
                   break;
                }
            }
        };
        
        self.submitTrack = function(){
            var track = self.currentTrack;
            if(track.trackid === null){
                console.log("New track submitted: "+self.trackToString(track));
                self.createTrack(track); //CREATE
            } else {
                console.log("Track "+track.trackid+" of album "+self.currentAlbum.id+" updated to: "+self.trackToString(self.currentTrack));
                self.updateTrack(track); //UPDATE
            }
            self.clearTrackForm();
        };
        
        self.deleteTrack = function(){
            console.log("Deleting track "+self.currentTrack.trackid+" (trackid, not tracknr)");
            self.removeTrack(self.currentTrack);
            self.clearTrackForm();
        };
        
        self.clearTrackForm = function(){
            console.log("Clearing trackForm");
            self.currentTrack = {trackid:null, tracknr:null, name:""};
            $scope.trackForm.$setPristine();
        };
        
        //----------------------------------------------------------------------
        //CRUD functions that call on trackService
        //----------------------------------------------------------------------
        
        self.fetchAllTracks = function(){
            trackService.query({ albumid: self.currentAlbum.id }, function(response){
                console.log("Fetching all tracks of album "+self.currentAlbum.id);
                self.currentAlbum.tracks = response;                
            });
        };
        
        self.createTrack = function(trackVar){
            var service = new trackService();
            service.albumid = self.currentAlbum.id;
            service.tracknr = trackVar.tracknr;
            service.name = trackVar.name;            
            service.$save(function(response){
                console.log("New track saved in database"+response.message);
                self.fetchAllTracks();
            });
        };
        
        self.updateTrack = function(trackVar){
            var service = new trackService();
            service.trackid = trackVar.trackid;
            service.albumid = self.currentAlbum.id;
            service.tracknr = trackVar.tracknr;
            service.name = trackVar.name;            
            service.$update(function(){
                console.log("Track "+trackVar.trackid+" updated in database");
                self.fetchAllTracks();
            });
        };
        
        self.removeTrack = function(trackVar){
            var service = new trackService();
            service.trackid = trackVar.trackid;
            service.albumid = self.currentAlbum.id;
            service.$delete(function(){
                console.log("Track "+trackVar.trackid+" removed from database");
                self.fetchAllTracks();
            });
        };
    };
})();