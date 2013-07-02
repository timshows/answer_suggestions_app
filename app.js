(function() {
  var searchApiEndpoint;

  return {
    doneLoading: false,
    defaultState: 'spinner',
    defaultNumberOfEntriesToDisplay: 10,

    events: {
      // APP EVENTS
      'app.activated'                           : 'initializeIfReady',
      'ticket.status.changed'                   : 'initializeIfReady',
      'ticket.subject.changed'                  : _.debounce(function(){
        this.initialize();
      }, 500),
      // AJAX EVENTS
      'search.done'                             : 'searchDone',
      // DOM EVENTS
      'click,dragend ul.entries a.copy_link'    : 'copyLink',
      'keyup .custom-search input'              : function(event){
        if(event.keyCode === 13)
          return this.customSearch();
      },
      'click .custom-search button'             : 'customSearch'
    },

    requests: {
      search: function(query){
        this.switchTo('spinner');
        return {
          url: searchApiEndpoint + query,
          type: 'GET'
        };
      }
    },

    searchUrlPrefix: function() {
      return this.setting('search_hc') ? '/hc' : '';
    },

    initializeIfReady: function(){
      if (this.canInitialize()){
        this.initialize();
        this.doneLoading = true;
      }
    },

    canInitialize: function(){
      return (!this.doneLoading &&
              this.ticket());
    },

    initialize: function(){
      searchApiEndpoint = this.searchUrlPrefix() + '/api/v2/search.json?query=type:topic ';
      if (_.isEmpty(this.ticket().subject()))
        return this.switchTo('no_subject');

      return this.ajax('search', this.subjectSearchQuery());
    },

    customSearch: function(){
      this.ajax('search', this.$('.custom-search input').val());
    },

    searchDone: function(data) {
      if (_.isEmpty(data.results))
        return this.switchTo('no_entries');

      return this.switchTo('list', {
        entries: _.reduce(data.results.slice(0,this.numberOfDisplayableEntries()),
                          function(memo, entry){
                            memo.push({
                              id: entry.id,
                              url: this.baseUrl() + this.articlePath(entry.id),
                              title: entry.title || entry.name
                            });
                            return memo;
                          }, [], this)
      });
    },

    baseUrl: function(){
      if (this.setting('custom_host'))
        return this.setting('custom_host');
      return "https://" + this.currentAccount().subdomain() + ".zendesk.com/";
    },

    articlePath: function(articleId) {
      if (this.setting('search_hc')) {
        return 'hc/articles/' + articleId;
      } else {
        return 'entries/' + articleId;
      }
    },

    copyLink: function(event){
      event.preventDefault();
      var content = "";

      if (this.setting('include_title')) { content = event.currentTarget.title + ' - '; }

      content += event.currentTarget.href;

      return this.appendToComment(content);
    },

    appendToComment: function(text){
      var old_text = _.isEmpty(this.comment().text()) ? '' : this.comment().text() + '\n';
      return this.comment().text( old_text + text);
    },

    stop_words: _.memoize(function(){
      return _.map(this.I18n.t("stop_words").split(','), function(word) { return word.trim(); });
    }),

    numberOfDisplayableEntries: function(){
      return this.setting('nb_entries') || this.defaultNumberOfEntriesToDisplay;
    },

    // extracted from http://geeklad.com/remove-stop-words-in-javascript
    removeStopWords: function(str, stop_words){
      var words = str.match(/[^\s]+|\s+[^\s+]$/g);
      var x,y = 0;

      for(x=0; x < words.length; x++) {
        // For each word, check all the stop words
        for(y=0; y < stop_words.length; y++) {
          // Get the current word
          var word = words[x].replace(/\s+|[^a-z]+\'/ig, "");

          // Get the stop word
          var stop_word = stop_words[y];

          // If the word matches the stop word, remove it from the keywords
          if(word.toLowerCase() == stop_word) {
            // Build the regex
            var regex_str = "^\\s*"+stop_word+"\\s*$";// Only word
            regex_str += "|^\\s*"+stop_word+"\\s+";// First word
            regex_str += "|\\s+"+stop_word+"\\s*$";// Last word
            regex_str += "|\\s+"+stop_word+"\\s+";// Word somewhere in the middle

            var regex = new RegExp(regex_str, "ig");

            str = str.replace(regex, " ");
          }
        }
      }
      // Remove punctuation and trim
      return str.replace(/[\!\?\,\.\;]/g,"")
        .replace(/^\s+|\s+$/g, "");
    },

    subjectSearchQuery: function(s){
      return this.removeStopWords(this.ticket().subject(), this.stop_words());
    }
  };
}());
