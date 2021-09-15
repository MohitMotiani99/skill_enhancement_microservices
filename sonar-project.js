const sonarqubeScanner=require('sonarqube-scanner');
sonarqubeScanner(
    {
        serverUrl:  'http://localhost:9000',
        options : {
            'sonar.sources':  '.',
            'sonar.tests':  'tests',
            'sonar.inclusions'  :  'modules/answers/answers,modules/questions/questions,modules/notifications/notifications,modules/dashboard/dashboard,modules/users/users,modules/comments/comments', // Entry point of your code
            'sonar.test.inclusions':  'tests/**',
            'sonar.projectName': 'skillenhance_dockerized',
            'sonar.javascript.lcov.reportPaths':  'coverage/lcov.info',
            'sonar.login': 'admin',
            'sonar.password': 'mohit'
        }
    }, () => {});