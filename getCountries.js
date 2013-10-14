var mdb = require('moviedb')('587f66b889909f01e5c37ef1bafe2cca'),
	neo4j = require('neo4j'),
	db = new neo4j.GraphDatabase('http://localhost:7474'),
	jsonRequest = require('request-json'),
	jsonClient = jsonRequest.newClient('https://raw.github.com/mledoze/countries/master/')

jsonClient.get('countries.json', function(err, res, body) {

	body.forEach(function(country) {

		var countryNode = db.createNode({
			countryId : country.cca2,
			name : country.name
		})

		countryNode.save(function(err, savedCountryNode) {
			if(err) {
				console.log('Error saving country: ' + err)
			} else {
				// Index saved country node
				console.log('Country:' + savedCountryNode.toString() + ' & countryId:' + countryNode.data.countryId)
				savedCountryNode.index('country', 'countryId', countryNode.data.countryId, function() {})
			}
		})

	})

})