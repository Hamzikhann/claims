"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define("claimDiagnoses", {}, { timestamps: true });
	table.associate = function (models) {
		table.belongsTo(models.claims);
		table.belongsTo(models.diagnoses);
	};
	return table;
};
