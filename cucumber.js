module.exports = {
  default: {
    paths: ["tests/bdd/features/**/*.feature"],
    require: ["tests/bdd/support/**/*.js", "tests/bdd/steps/**/*.js"],
    format: ["progress", "html:test-results/cucumber-report.html"],
    publishQuiet: true
  }
};
