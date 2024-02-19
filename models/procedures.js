"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"procedures",
		{
			code: DataTypes.STRING,
			description: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},

		{ timestamps: true }
	);
	table.associate = function (models) {
		table.hasMany(models.claimProcedures);
	};
	return table;
};
