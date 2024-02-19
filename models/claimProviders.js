"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"claimProviders",
		{
			providerType: DataTypes.STRING
		},

		{ timestamps: true }
	);
	table.associate = function (models) {
		table.belongsTo(models.claims);
		table.belongsTo(models.providers);
	};
	return table;
};
