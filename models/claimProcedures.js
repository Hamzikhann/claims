"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"claimProcedures",
		{
			service_line_identifier: DataTypes.STRING,
			amountCharged: DataTypes.STRING,
			isFlagged: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: 0
			}
		},

		{ timestamps: true }
	);
	table.associate = function (models) {
		table.belongsTo(models.claims);
		table.belongsTo(models.procedures);
	};
	return table;
};
