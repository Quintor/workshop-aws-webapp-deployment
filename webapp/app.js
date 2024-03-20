//wrap the app in a closure
(function(){
    'use strict';
    
    // Declare app level module which depends on views, and components
    angular.module('cddb4client', [
      'ngRoute',
      'myApp.version',
      'ngResource'
    ]);
    
})();