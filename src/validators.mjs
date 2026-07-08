import { body, checkSchema, param, query } from "express-validator";
import { Types } from "mongoose";

export const signupValidator = checkSchema({
    username: {
        in: ['body'],
        isString: { errorMessage: 'username must be a string' },
        notEmpty: { errorMessage: 'username is required' },
        isLength: { options: { max: 50 }, errorMessage: 'username max length is 50' }
    },
    email: {
        in: ['body'],
        isString: { errorMessage: 'email must be a string' },
        notEmpty: { errorMessage: 'email is required' },
        isEmail: { errorMessage: 'email must be valid' },
        isLength: { options: { max: 100 }, errorMessage: 'email max length is 100' },
    },
    phone_number: {
        in: ['body'],
        isString: { errorMessage: 'phone_number must be a string' },
        notEmpty: { errorMessage: 'phone_number is required' },
        matches: {
            options: [/^\+?[0-9\s\-()]{7,20}$/],
            errorMessage: 'phone_number must be a valid international format (+, digits, spaces, parentheses, hyphens allowed, 7-20 characters)'
        },
        isLength: { options: { max: 20 }, errorMessage: 'phone_number max length is 20' }
    },
    status: {
        in: ['body'],
        isBoolean: { errorMessage: 'status must be boolean' },
        toBoolean: true
    },
    date_joined: {
        in: ['body'],
        optional: true,
        isISO8601: { errorMessage: 'date_joined must be a valid yyyy-mm-dd date' }
    },
    password: {
        in: ['body'],
        isLength: {
            options: { min: 8, max: 50 },
            errorMessage: "Password must be 8-50 characters",
        },
        custom: {
            options: (value) => {
                const hasLower = /[a-z]/.test(value);
                const hasUpper = /[A-Z]/.test(value);
                const hasDigit = /\d/.test(value);
                const hasSpecial = /[@$!%*?&]/.test(value);
                return hasLower && hasUpper && hasDigit && hasSpecial;
            },
            errorMessage: "Password must contain lowercase, uppercase, number and special char"
        }
    }
});


export const loginValidator = [
    body("idToken")
        .notEmpty().withMessage("idToken is required")
        .isString().withMessage("idToken must be a string")
        .trim(),
];

export const updateProfileValidator = [
    body("displayName")
        .optional()
        .trim()
        .isLength({ min: 2, max: 30 }).withMessage("Display name must be 2-30 characters")
        .escape(),
    body("password")
        .optional()
        .isLength({ min: 8, max: 50 }).withMessage("Password must be 8-50 characters")
        .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
        .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
        .matches(/\d/).withMessage("Password must contain at least one number")
        .matches(/[@$!%*?&]/).withMessage("Password must contain at least one special character"),
];

export const resetPasswordValidator = [
    body("email")
        .isEmail().withMessage("Must be a valid email")
        .normalizeEmail(),
];

export const deleteAccountValidator = [
    body("confirm")
        .equals("DELETE").withMessage("You must type 'DELETE' to confirm account deletion"),
];

export const updatePasswordValidator = [
    body("email")
        .isEmail().withMessage("A valid email is required")
        .normalizeEmail(),
    body("oldPassword")
        .isLength({ min: 8 }).withMessage("Old password must be at least 8 characters"),
    body("newPassword")
        .isLength({ min: 8 }).withMessage("New password must be at least 8 characters")
        .matches(/[A-Z]/).withMessage("New password must contain at least one uppercase letter")
        .matches(/[a-z]/).withMessage("New password must contain at least one lowercase letter")
        .matches(/\d/).withMessage("New password must contain at least one digit")
        .matches(/[@$!%*?&#]/).withMessage("New password must contain at least one special character"),
    body("confirmNewPassword")
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error("Confirm password does not match new password");
            }
            return true;
        }),
];


export const regionValidators = {

    create: [
        body('region_name')
            .isString().withMessage('region_name must be a string')
            .notEmpty().withMessage('region_name is required')
            .isLength({ max: 100 }).withMessage('region_name max length is 100'),
        body('region_code')
            .isString().withMessage('region_code must be a string')
            .notEmpty().withMessage('region_code is required')
            .isLength({ max: 10 }).withMessage('region_code max length is 10'),
        body('country')
            .isString().withMessage('country must be a string')
            .notEmpty().withMessage('country is required')
            .isLength({ max: 50 }).withMessage('country max length is 50'),
        body('created_at')
            .optional()
            .isISO8601().withMessage('created_at must be a valid ISO8601 date'),
    ],

    update: [
        param('id').isMongoId().withMessage('Invalid region ID'),
        body('region_name')
            .optional()
            .isString().withMessage('region_name must be a string')
            .isLength({ max: 100 }).withMessage('region_name max length is 100'),
        body('region_code')
            .optional()
            .isString().withMessage('region_code must be a string')
            .isLength({ max: 10 }).withMessage('region_code max length is 10'),
        body('country')
            .optional()
            .isString().withMessage('country must be a string')
            .isLength({ max: 50 }).withMessage('country max length is 50'),
        body('created_at')
            .optional()
            .isISO8601().withMessage('created_at must be a valid ISO8601 date'),
    ],

    idParam: [
        param('id')
            .isMongoId().withMessage('Invalid region ID'),
    ],
};

export const createVerticalValidation = [
    body('vertical_name')
        .isString()
        .withMessage('vertical_name must be a string')
        .isLength({ max: 100 })
        .withMessage('vertical_name max length is 100')
        .notEmpty()
        .withMessage('vertical_name is required'),
    body('vertical_code')
        .isString()
        .withMessage('vertical_code must be a string')
        .isLength({ max: 20 })
        .withMessage('vertical_code max length is 20')
        .notEmpty()
        .withMessage('vertical_code is required'),
    body('description')
        .isString()
        .withMessage('description must be a string')
        .notEmpty()
        .withMessage('description is required'),
    body('created_at')
        .isISO8601()
        .toDate()
        .withMessage('created_at must be a valid date')
        .notEmpty()
        .withMessage('created_at is required')
];

export const updateVerticalValidation = [
    param('id')
        .isMongoId()
        .withMessage('Invalid vertical ID'),
    body('vertical_name')
        .optional()
        .isString()
        .withMessage('vertical_name must be a string')
        .isLength({ max: 100 })
        .withMessage('vertical_name max length is 100'),
    body('vertical_code')
        .optional()
        .isString()
        .withMessage('vertical_code must be a string')
        .isLength({ max: 20 })
        .withMessage('vertical_code max length is 20'),
    body('description')
        .optional()
        .isString()
        .withMessage('description must be a string'),
    body('created_at')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('created_at must be a valid date')
];

export const idValidation = [
    param('id')
        .isMongoId()
        .withMessage('Invalid vertical ID')
];

export const createChapterValidation = [
    body('chapter_name').isString().isLength({ max: 100 }).notEmpty(),
    body('chapter_code').isString().isLength({ max: 20 }).notEmpty(),
    body('region_name').isString().notEmpty(),
    body('meeting_day').isString().isLength({ max: 30 }).notEmpty(),
    body('meeting_time').isString().notEmpty(),
    body('meeting_location').isString().notEmpty(),
    body('meeting_address').isString().notEmpty(),
    body('chapter_status').isBoolean().notEmpty(),
    body('founded_date').isISO8601().toDate().notEmpty(),
    body('max_members').isInt().notEmpty(),
    body('current_member_count').isInt().notEmpty()
];

export const updateChapterValidation = [
    param('id').isMongoId(),
    body('chapter_name').optional().isString().isLength({ max: 100 }),
    body('chapter_code').optional().isString().isLength({ max: 20 }),
    body('region_name').optional().isString(),
    body('meeting_day').optional().isString().isLength({ max: 30 }),
    body('meeting_time').optional().isString(),
    body('meeting_location').optional().isString(),
    body('meeting_address').optional().isString(),
    body('chapter_status').optional().isString().isLength({ max: 10 }),
    body('founded_date').optional().isISO8601().toDate(),
    body('max_members').optional().isInt(),
    body('current_member_count').optional().isInt()
];

export const createMembershipValidation = [
    body('username').isString().notEmpty(),
    body('role').isString().isLength({ max: 50 }).notEmpty(),
    body('membership_status').isBoolean().notEmpty(),
    body('join_date').isISO8601().toDate().notEmpty(),
    body('renewal_date').isISO8601().toDate().notEmpty(),
    body('termination_date').optional().isISO8601().toDate(),
    body('termination_reason').optional().isString()
];

export const updateMembershipValidation = [
    param('id').isMongoId(),
    body('username').optional().isString(),
    body('chapter_name').optional().isString(),
    body('role').optional().isString().isLength({ max: 50 }),
    body('membership_status').optional().isBoolean(),
    body('join_date').optional().isISO8601().toDate(),
    body('renewal_date').optional().isISO8601().toDate(),
    body('termination_date').optional().isISO8601().toDate(),
    body('termination_reason').optional().isString()
];

export const createSummaryValidation = [
    body('chapter_name').isString().notEmpty(),
    body('period_year').isInt({ min: 1900 }).notEmpty(),
    body('period_month').isInt({ min: 1, max: 12 }).notEmpty(),
    body('total_members').isInt({ min: 0 }).notEmpty(),
    body('active_members').isInt({ min: 0 }).notEmpty(),
    body('total_referrals').isInt({ min: 0 }).notEmpty(),
    body('total_business').isDecimal().notEmpty(),
    body('meetings_held').isInt({ min: 0 }).notEmpty(),
    body('average_attendance').isDecimal().notEmpty(),
    body('visitors_total').isInt({ min: 0 }).notEmpty(),
    body('new_members_joined').isInt({ min: 0 }).notEmpty(),
    body('members_terminated').isInt({ min: 0 }).notEmpty(),
    body('one_to_ones_total').isInt({ min: 0 }).notEmpty()
];

export const updateSummaryValidation = [
    param('id').isMongoId(),
    body('chapter_name').optional().isString(),
    body('period_year').optional().isInt({ min: 1900 }),
    body('period_month').optional().isInt({ min: 1, max: 12 }),
    body('total_members').optional().isInt({ min: 0 }),
    body('active_members').optional().isInt({ min: 0 }),
    body('total_referrals').optional().isInt({ min: 0 }),
    body('total_business').optional().isDecimal(),
    body('meetings_held').optional().isInt({ min: 0 }),
    body('average_attendance').optional().isDecimal(),
    body('visitors_total').optional().isInt({ min: 0 }),
    body('new_members_joined').optional().isInt({ min: 0 }),
    body('members_terminated').optional().isInt({ min: 0 }),
    body('one_to_ones_total').optional().isInt({ min: 0 })
];

export const searchUserValidator = [
    body("substr")
        .exists().withMessage("Search substring (substr) is required.")
        .bail()
        .isString().withMessage("Search substring must be a string.")
        .bail()
        .trim()
        .notEmpty().withMessage("Search substring cannot be empty.")
        .bail()
        .isLength({ max: 50 }).withMessage("Search substring too long (max 50 chars).")
        .bail()
        .matches(/^[a-zA-Z0-9@._\s-]+$/)
        .withMessage("Invalid characters. Use letters, numbers, spaces, or @._- only.")
];

export const createEventValidation = [
    body('event_title').isString().isLength({ max: 255 }).notEmpty(),
    body('event_description').isString().optional(),
    body('event_date').isISO8601().toDate().notEmpty(),
    body('event_time').isString().notEmpty(),
    body('location').isString().notEmpty(),
    body('organizer_company').isString().isLength({ max: 100 }).notEmpty(),
    body('event_type').isString().isLength({ max: 50 }).notEmpty(),
    body('event_status').isString().isLength({ max: 20 }).notEmpty(),
];

export const updateEventValidation = [
    body('event_title').optional().isString().isLength({ max: 255 }),
    body('event_description').optional().isString(),
    body('event_date').optional().isISO8601().toDate(),
    body('event_time').optional().isString(),
    body('location').optional().isString(),
    body('organizer_company').optional().isString().isLength({ max: 100 }),
    body('event_type').optional().isString().isLength({ max: 50 }),
    body('event_status').optional().isString().isLength({ max: 20 }),
];

export const createMeetingValidation = [
    body('meeting_date').isISO8601().toDate().notEmpty(),
    body('meeting_time').isString().notEmpty(),
    body('title').isString().notEmpty().isLength({ max: 200 }),
    body('meeting_type').isString().isLength({ max: 50 }).notEmpty(),
    body('location').isString().notEmpty(),
    body('meeting_notes').isString().optional(),
    body('duration').isNumeric().optional(),
    body('meeting_status').isString().isLength({ max: 50 }).notEmpty(),
    body('attendance_status').isBoolean().notEmpty(),
];

export const updateMeetingValidation = [
    param('id').isMongoId(),
    body('meeting_date').optional().isISO8601().toDate(),
    body('meeting_time').optional().isString(),
    body('title').isString().isLength({ max: 200 }).optional(),
    body('meeting_type').optional().isString().isLength({ max: 50 }),
    body('location').optional().isString(),
    body('meeting_notes').optional().isString(),
    body('duration').optional().isNumeric(),
    body('attendance_status').isBoolean().optional(),
    body('meeting_status').optional().isBoolean().isLength({ max: 20 })
];

export const createAttendanceValidation = [
    body('username').isString().notEmpty(),
    body('meeting_id').isString().notEmpty(),
    body('attendance_status').isString().isLength({ max: 20 }).notEmpty(),
    body('date').isISO8601().toDate().notEmpty()
];

export const createBulkAttendanceValidation = [
    body('usersdata').isArray().notEmpty(),
    body('meeting_id').isString().notEmpty(),
    body('date').isISO8601().toDate().notEmpty()
];

export const updateAttendanceValidation = [
    param('id').isMongoId(),
    body('username').optional().isString(),
    body('meeting_id').isString().optional(),
    body('attendance_status').optional().isString().isLength({ max: 20 }),
    body('date').optional().isISO8601().toDate()
];

export const createPerformanceValidation = [
    body('username').isString().notEmpty(),
    body('chapter_name').isString().notEmpty(),
    body('period_year').isInt({ min: 1900 }).notEmpty(),
    body('period_6month').isInt({ min: 1, max: 2 }).notEmpty(),
    body('period_month').isInt({ min: 1, max: 12 }).notEmpty(),
    body('referrals_given').isInt({ min: 0 }).notEmpty(),
    body('referrals_received').isInt({ min: 0 }).notEmpty(),
    body('business_given').isDecimal().notEmpty(),
    body('business_received').isDecimal().notEmpty(),
    body('meetings_attended').isInt({ min: 0 }).notEmpty(),
    body('one_to_ones_held').isInt({ min: 0 }).notEmpty(),
    body('visitors_brought').isInt({ min: 0 }).notEmpty()
];

export const updatePerformanceValidation = [
    param('id').isMongoId(),
    body('username').optional().isString(),
    body('chapter_name').optional().isString(),
    body('period_year').optional().isInt({ min: 1900 }),
    body('period_6month').optional().isInt({ min: 1, max: 2 }),
    body('period_month').optional().isInt({ min: 1, max: 12 }),
    body('referrals_given').optional().isInt({ min: 0 }),
    body('referrals_received').optional().isInt({ min: 0 }),
    body('business_given').optional().isDecimal(),
    body('business_received').optional().isDecimal(),
    body('meetings_attended').optional().isInt({ min: 0 }),
    body('one_to_ones_held').optional().isInt({ min: 0 }),
    body('visitors_brought').optional().isInt({ min: 0 })
];

export const createNotificationValidation = [
    body("receiver").exists().withMessage("receiver required").isString().withMessage("receiver must be string"),
    body("sender").optional().isString().withMessage("sender must be string"),
    body("header").optional().isString().withMessage("header must be string").isLength({ max: 80 }).withMessage("max 80 chars header"),
    body("content").exists().withMessage("content required").isString().withMessage("content must be string").isLength({ min: 2, max: 1024 }).withMessage("content must be 2-1024 chars"),
    body("read").optional().isBoolean().withMessage("read must be boolean"),
    body("readAt").optional().isISO8601().withMessage("readAt must be date"),
];

export const createbulkNotificationValidation = [
    body("header").optional().isString().withMessage("header must be string").isLength({ max: 80 }).withMessage("max 80 chars header"),
    body("content").exists().withMessage("content required").isString().withMessage("content must be string").isLength({ min: 2, max: 1024 }).withMessage("content must be 2-1024 chars"),
    body("read").optional().isBoolean().withMessage("read must be boolean"),
    body("readAt").optional().isISO8601().withMessage("readAt must be date"),
];

export const getNotificationsValidation = [
    query("receiver").optional().isString().withMessage("receiver must be string"),
    query("read").optional().isIn(["true", "false"]).withMessage("read must be boolean string"),
];

export const getNotificationByIdValidation = [
    param("id").exists().custom((v) => Types.ObjectId.isValid(v)).withMessage("invalid id"),
];

export const updateNotificationValidation = [
    param("id").exists().custom((v) => Types.ObjectId.isValid(v)).withMessage("invalid id"),
    body("header").optional().isString().withMessage("header must be string").isLength({ max: 80 }).withMessage("max 80 chars header"),
    body("content").optional().isString().withMessage("content must be string").isLength({ min: 2, max: 1024 }).withMessage("content must be 2-1024 chars"),
    body("read").optional().isBoolean().withMessage("read must be boolean"),
    body("readAt").optional().isISO8601().withMessage("readAt must be date"),
];

export const deleteNotificationValidation = [
    param("id").exists().custom((v) => Types.ObjectId.isValid(v)).withMessage("invalid id"),
];

export const createBulkNotificationwithoutSenderValidation = [
    body("receiverList").exists().withMessage("receiver required").isArray().withMessage("receiver must be array"),
    body("header").optional().isString().withMessage("header must be string").isLength({ max: 80 }).withMessage("max 80 chars header"),
    body("content").exists().withMessage("content required").isString().withMessage("content must be string").isLength({ min: 2, max: 1024 }).withMessage("content must be 2-1024 chars"),
];

const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const createProfileValidation = [
    body('display_name')
        .optional({ checkFalsy: true })
        .isString()
        .isLength({ max: 50 }),

    body('profile_image_url')
        .optional({ checkFalsy: true })
        .isURL()
        .withMessage('profile_image_url must be a valid URL'),

    body('company_phone')
        .optional({ checkFalsy: true })
        .isString()
        .isLength({ max: 20 }),

    body('company_email')
        .optional({ checkFalsy: true })
        .isEmail()
        .isLength({ max: 100 }),

    body('company_address')
        .optional({ checkFalsy: true })
        .isString(),

    body('personal_address')
        .optional({ checkFalsy: true })
        .isString(),

    body('dob')
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate()
        .custom(v => v <= new Date())
        .withMessage('dob cannot be in the future'),

    body('wedding_date')
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate()
        .custom(v => v <= new Date())
        .withMessage('wedding_date cannot be in the future'),

    body('blood_group')
        .optional({ checkFalsy: true })
        .isIn(validBloodGroups)
        .withMessage('Invalid blood group'),

    body('vagai_category').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
    body('kulam_category').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
    body('native_place').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
    body('kuladeivam').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
    body('company_name').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),

    body('vertical_ids')
        .optional({ checkFalsy: true })
        .isArray()
        .withMessage('vertical_ids must be an array of Strings')
        .custom(arr => arr.every(id => typeof id === 'string' && id.trim().length > 0))
        .withMessage('Each vertical_id must be a valid Name'),

    body('years_in_business')
        .optional({ checkFalsy: true })
        .isInt({ min: 0 })
        .withMessage('years_in_business cannot be negative'),

    body('annual_turnover')
        .optional({ checkFalsy: true })
        .isInt({ min: 0 })
        .withMessage('annual_turnover cannot be negative'),

    body('website')
        .optional({ checkFalsy: true })
        .isLength({ max: 255 })
        .withMessage('website must be a valid URL starting with http or https'),

    body('services')
        .optional({ checkFalsy: true })
        .isArray()
        .custom(arr => arr.every(s => typeof s === 'string' && s.trim().length > 0))
        .withMessage('services must be an array of non-empty strings'),

    body('ideal_referral').optional({ checkFalsy: true }).isString(),
    body('bio').optional({ checkFalsy: true }).isString(),
    body('elevator_pitch_30s').optional({ checkFalsy: true }).isString(),
    body('why_sib').optional({ checkFalsy: true }).isString(),
];

export const updateProfileValidation = [
    body('display_name').optional({ checkFalsy: true }).isString().isLength({ max: 50 }),
    body('profile_image_url').optional({ checkFalsy: true }),
    body('company_phone').optional({ checkFalsy: true }).isString().isLength({ max: 20 }),
    body('company_email').optional({ checkFalsy: true }).isEmail().isLength({ max: 100 }),
    body('company_address').optional({ checkFalsy: true }).isString(),
    body('personal_address').optional({ checkFalsy: true }).isString(),

    body('dob')
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate()
        .custom(v => v <= new Date())
        .withMessage('dob cannot be in the future'),

    body('wedding_date')
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate()
        .custom(v => v <= new Date())
        .withMessage('wedding_date cannot be in the future'),

    body('blood_group').optional({ checkFalsy: true }).isIn(validBloodGroups),

    body('vagai_category').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
    body('kulam_category').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
    body('native_place').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
    body('kuladeivam').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
    body('company_name').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),

    body('vertical_ids')
        .optional({ checkFalsy: true })
        .isArray()
        .custom(arr => arr.every(id => typeof id === 'string' && id.trim().length > 0))
        .withMessage('Each vertical_id must be a valid Name'),

    body('years_in_business').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('annual_turnover').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('website').optional({ checkFalsy: true }).isLength({ max: 255 }),

    body('services')
        .optional({ checkFalsy: true })
        .isArray()
        .custom(arr => arr.every(s => typeof s === 'string' && s.trim().length > 0))
        .withMessage('services must be an array of non-empty strings'),

    body('ideal_referral').optional({ checkFalsy: true }).isString(),
    body('bio').optional({ checkFalsy: true }).isString(),
    body('elevator_pitch_30s').optional({ checkFalsy: true }).isString(),
    body('why_sib').optional({ checkFalsy: true }).isString(),
];

export const createOneToOneMeetingValidation = [
    body('member2_name').isString().notEmpty(),
    body('chapter_name').isString().notEmpty(),
    body('meeting_date').isISO8601().toDate().notEmpty(),
    body('location').isString().isLength({ max: 255 }).notEmpty(),
    body('discussion_points').optional().isString(),
    body('created_by_username').isString().notEmpty(),
    body('status').isBoolean().notEmpty(),
    body('image_url').isString().notEmpty(),
];

export const updateOneToOneMeetingValidation = [
    param('id').isMongoId(),
    body('member1_name').optional().isString(),
    body('member2_name').optional().isString(),
    body('chapter_name').optional().isString(),
    body('meeting_date').optional().isISO8601().toDate(),
    body('location').optional().isString().isLength({ max: 255 }),
    body('discussion_points').optional().isString(),
    body('created_by_username').optional().isString(),
    body('status').isBoolean().optional(),
    body('image_url').isString().optional(),
];

export const createReferralValidation = [
    body('referrer_username').isString().notEmpty(),
    body('referee_username').isString().notEmpty(),
    body('contact_name').isString().isLength({ max: 100 }).optional(),
    body('description').isString().notEmpty(),
    body('referral_type').isString().isLength({ max: 20 }).notEmpty(),
    body('referral_status').isArray({ max: 3 }),
    body('contact_phone').isString().isLength({ max: 20 }).isNumeric(),
    body('contact_email').isEmail().isLength({ max: 100 }).optional(),
    body('contact_address').isString().optional(),
    body('comments').isString().optional(),
    body('hot').isString().isLength({ max: 20 }).notEmpty(),
    body('created_at').isISO8601().toDate().notEmpty(),
    body('status').isBoolean().notEmpty(),
];

export const updateReferralValidation = [
    param('id').isMongoId(),
    body('referrer_username').optional().isString(),
    body('referee_username').optional().isString(),
    body('contact_name').optional().isString().isLength({ max: 100 }),
    body('description').optional().isString(),
    body('referral_type').optional().isString().isLength({ max: 20 }),
    body('referral_status').optional().isArray({ max: 3 }),
    body('contact_phone').optional().isString().isLength({ max: 20 }),
    body('contact_email').optional().isEmail().isLength({ max: 100 }),
    body('contact_address').optional().isString(),
    body('comments').optional().isString(),
    body('hot').optional().isString().isLength({ max: 20 }),
    body('created_at').optional().isISO8601().toDate(),
    body('status').isBoolean().optional(),
];

export const updateBulkM2MStatusValidation = [
    body('list').isArray().notEmpty(),
]

export const updateBulkTyftbValidation = [
    body('list').isArray().notEmpty(),
]

export const updateBulkReferralValidation = [
    body('list').isArray().notEmpty(),
]

export const createVisitorValidation = [
    body('inviting_member_display_name').isString().notEmpty(),
    body('visitor_name').isString().isLength({ max: 100 }).notEmpty(),
    body('visitor_company').isString().isLength({ max: 100 }).notEmpty(),
    body('visitor_phone').isString().isLength({ max: 20 }).notEmpty(),
    body('visitor_email').isString().isLength({ max: 100 }).notEmpty(),
    body('business_category').isString().isLength({ max: 100 }).notEmpty(),
    body('industry').isString().isLength({ max: 100 }).notEmpty(),
    body('presentation_given').isBoolean().notEmpty(),
    body('follow_up_notes').optional().isString(),
    body('converted_to_member').isBoolean().notEmpty(),
    body('member_username').optional().isString(),
    body('status').isBoolean().notEmpty(),
];

export const updateVisitorValidation = [
    param('id').isMongoId(),
    body('inviting_member_display_name').optional().isString(),
    body('visitor_name').optional().isString().isLength({ max: 100 }),
    body('visitor_company').optional().isString().isLength({ max: 100 }),
    body('visitor_phone').optional().isString().isLength({ max: 20 }),
    body('visitor_email').optional().isString().isLength({ max: 100 }),
    body('business_category').optional().isString().isLength({ max: 100 }),
    body('industry').optional().isString().isLength({ max: 100 }),
    body('presentation_given').optional().isBoolean(),
    body('follow_up_notes').optional().isString(),
    body('converted_to_member').optional().isBoolean(),
    body('member_username').optional().isString(),
    body('status').isBoolean().optional(),
];

export const createTyftbValidation = [
    body('referral_code').isString().isLength({ max: 20 }).optional(),
    body('receiver_displayname').isString().notEmpty(),
    body('business_type').isString().notEmpty().isLength({ max: 50 }),
    body('referral_type').isString().notEmpty().isLength({ max: 20 }),
    body('business_amount').isDecimal().notEmpty(),
    body('business_description').isString().optional(),
    body('created_at').isISO8601().notEmpty(),
    body('status').isBoolean().notEmpty(),
];

export const updateTyftbValidation = [
    param('id').isMongoId(),
    body('referral_code').optional().isString().isLength({ max: 20 }),
    body('payer_displayname').optional().isString(),
    body('receiver_displayname').optional().isString(),
    body('business_type').optional().isString().isLength({ max: 50 }),
    body('referral_type').optional().isString().isLength({ max: 20 }),
    body('business_amount').optional().isDecimal(),
    body('business_description').optional().isString(),
    body('created_at').optional().isISO8601(),
    body('status').isBoolean().optional(),
];