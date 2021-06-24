export interface PostForgotPasswordOptions {
    email: string;
}

export interface PutUpdatePasswordOptions {
    newPassword: string;
    oldPassword: string;
}

export interface PutUpdateNilPasswordOptions {
    newPassword: string;
    ltik: string;
}

export interface PutUpdateForgottonPasswordOptions {
    newPassword: string;
    email: string;
    forgotPasswordToken: string;
}

export interface PostLoginOptions {
    email: string;
    password: string;
}

export interface PostResendVerificationOptions {
    email: string;
}

export interface GetVerificationOptions {
    verifyToken: string;
    confirmEmail: string;
}

export interface GetUsersOptions {
    courseId: number;
}

export interface RegisterUserOptions {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}
