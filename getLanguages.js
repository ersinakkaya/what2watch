var mdb = require('moviedb')('587f66b889909f01e5c37ef1bafe2cca'),
	neo4j = require('neo4j'),
	db = new neo4j.GraphDatabase('http://localhost:7474'),
	jsdom = require('jsdom'),
	wikipedia = 'http://en.wikipedia.org/wiki/List_of_ISO_639-1_codes',
	jquery = 'http://code.jquery.com/jquery.js'
 
jsdom.env(wikipedia, [jquery], function (errors, window) {
	var $ = window.$
	var tds = $('table[class="wikitable sortable"] > tr > td')
	if (tds.size() % 10 != 0) {
		throw new Error('Ehhh something went terribly wrong')
	}

	for (var i = 0, s = tds.size(); i < s; i += 10) {

		var family      = $(tds[i+1]).text()
		var name        = $(tds[i+2]).text()
		var nativeName  = $(tds[i+3]).text()
		var alpha1      = $(tds[i+4]).text()
		var alpha2t     = $(tds[i+5]).text()
		var alpha2b     = $(tds[i+6]).text()
		var alpha3      = $(tds[i+7]).text().split(/\s+/)[0]
		var alpha6      = $(tds[i+8]).text()

		var languageNode = db.createNode({
			languageId : alpha1,
			name : name
		})

		languageNode.save(function(err, savedLanguageNode) {
			if(err) {
				console.log('Error saving language: ' + err)
			} else {
				// Index saved country node
				console.log('Language:' + savedLanguageNode.toString() + ' & languageId:' + savedLanguageNode.data.languageId)
				savedLanguageNode.index('language', 'languageId', savedLanguageNode.data.languageId, function() {})
			}
		})
    }
})