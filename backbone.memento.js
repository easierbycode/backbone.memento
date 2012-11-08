// Backbone.Memento v0.4.0
//
// Copyright (C)2011 Derick Bailey, Muted Solutions, LLC
// Distributed Under MIT Liscene
//
// Documentation and Full Licence Availabe at:
// http://github.com/derickbailey/backbone.memento

// ----------------------------
// Backbone.Memento
// ----------------------------
Backbone.Memento = (function(Backbone, _){

  var Memento = function(structure, config) {
    this.version = "0.4.0";

    config = _.extend({ ignore:[] }, config);

    var serializer = new Serializer(structure, config);
    var mementoStack = new MementoStack(structure, config, serializer);

    this.store = mementoStack.store;
    this.restore = mementoStack.restore;
    this.restart = mementoStack.restart;
  };

  var Serializer = function(structure, config) {
    var type = (structure instanceof Backbone.Model) ? "model" : "collection";

    function getAddedAttrDiff(newAttrs, oldAttrs){
      var removedAttrs = [];

      // guard clause to ensure we have attrs to compare
      if (!newAttrs || !oldAttrs){
        return removedAttrs;
      }

      // if the attr is found in the old set but not in
      // the new set, then it was remove in the new set
      for (var attr in oldAttrs){
        if (oldAttrs.hasOwnProperty(attr)){
          if (!newAttrs.hasOwnProperty(attr)){
            removedAttrs.push(attr);
          }
        }
      }

      return removedAttrs;
    }

    function removeAttributes(structure, attrsToRemove){
      for (var index in attrsToRemove){
        var attr = attrsToRemove[index];
        if (type === "model"){
          structure.unset(attr);
        } else {
          structure.remove(attr);
        }
      }
    }

    function dropIgnored(attrs, restoreConfig){
      attrs = _.clone(attrs);
      if (restoreConfig.hasOwnProperty("ignore") && restoreConfig.ignore.length > 0){
        for(var index in restoreConfig.ignore){
          var ignore = restoreConfig.ignore[index];
          delete attrs[ignore];
        }
      }
      return attrs;
    }

    function restoreState(previousState, restoreConfig){
      oldAttrs = dropIgnored(previousState, restoreConfig);

      //get the current state
      var currentAttrs = structure.toJSON();
      currentAttrs = dropIgnored(currentAttrs, restoreConfig);

      //handle removing attributes that were added
      var removedAttrs = getAddedAttrDiff(oldAttrs, currentAttrs);
      removeAttributes(structure, removedAttrs);

      //restore the previous state
      if (type === "model"){
        structure.set(oldAttrs);
      } else {
        structure.reset(oldAttrs);
      }
    }

    this.serialize = function() {
      var attrs = structure.toJSON();
      attrs = dropIgnored(attrs, config);

      return attrs;
    }

    this.deserialize = function(previousState, restoreConfig) {
      restoreState(previousState, restoreConfig);
    }
  };

  var MementoStack = function(structure, config, serializer) {

    var attributeStack;

    function initialize(){
      attributeStack = [];
    }

    this.store = function(){
      var attrs = serializer.serialize();
      attributeStack.push(attrs);
    }

    this.restore = function(restoreConfig){
      if (restoreConfig === undefined){
        restoreConfig = _.clone(config);
      }

      var last = attributeStack.length-1;
      if (last < 0){
        return null;
      }

      restoreState(last, restoreConfig);
    }

    var restoreState = function(last, restoreConfig) {
      //get the previous state
      var oldAttrs = attributeStack[last];
      if (oldAttrs === undefined){ return; }

      serializer.deserialize(oldAttrs, restoreConfig);

      //destroy the no-longer-current state
      delete attributeStack[last];
    }

    this.restart = function(){
      if(attributeStack.length === 0){
        return null;
      }
      restoreState(0, config);
      // restoreState deleted item 0, but really
      // we should be starting from scratch.
      initialize();
    }

    initialize();
  };

  return Memento;

})(Backbone, _);