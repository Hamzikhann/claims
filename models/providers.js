"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"providers",
		{
			providerId: DataTypes.STRING,
			providerName: DataTypes.STRING,
			providerAge: DataTypes.STRING,
			providerState: DataTypes.STRING,
			providerCity: DataTypes.STRING,
			providerSpecialty: DataTypes.STRING,
			providerEmail: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},

		{ timestamps: true }
	);
	table.associate = function (models) {
		table.hasMany(models.claimProviders);
		table.hasOne(models.physicianFlaggedChargesTopHcpc);
		table.hasOne(models.physicianFlaggedCharges);
	};
	return table;
};
