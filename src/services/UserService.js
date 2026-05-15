const User = require('../models/User');
const AppError = require('../utils/AppError');

class UserService {
    static async getUserProfile(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }
        return user;
    }

    static async updateUserProfile(userId, data) {
        return await User.updateProfile(userId, data);
    }

    static async getLivreursList() {
        return await User.findAvailableLivreurs();
    }
}

module.exports = UserService;