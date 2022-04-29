const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
    suite('GET Request Tests', function() {
        test('viewing one stock', function() {
            assert.fail('not yet implemented');
        });

        test('viewing and liking one stock', function() {
            assert.fail('not yet implemented');
        });

        test('attempting to like the same stock again', function() {
            assert.fail('not yet implemented');
        });

        test('viewing two stocks', function() {
            assert.fail('not yet implemented');
        });

        test('viewing and liking two stocks', function() {
            assert.fail('not yet implemented');
        });
    });
});
