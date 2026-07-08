import mongoose from 'mongoose';

const regionSchema = new mongoose.Schema({
    region_name: {
        type: String,
        required: true,
        maxlength: 100,
    },
    region_code: {
        type: String,
        required: true,
        maxlength: 10,
    },
    country: {
        type: String,
        required: true,
        maxlength: 50,
    },
    created_at: {
        type: Date,
        required: true,
    },
},
    {
        timestamps: true
    }
);

export const Region = mongoose.model('Region', regionSchema);

const verticalSchema = new mongoose.Schema({
    vertical_name: {
        type: String,
        required: true,
        maxlength: 100,
    },
    vertical_code: {
        type: String,
        required: true,
        maxlength: 20,
    },
    description: {
        type: String,
        required: true,
    },
    created_at: {
        type: Date,
        required: true,
    },
},
    {
        timestamps: true
    }
);

export const Vertical = mongoose.model('Vertical', verticalSchema);

const coordinatorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        trim: true
    },
    chapter_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'chapters',
        required: true
    }
}, { timestamps: true });

export const Coordinator = mongoose.model('coordinators', coordinatorSchema);

const userSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        maxlength: 100,
        match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
    },
    phone_number: {
        type: String,
        required: true,
        maxlength: 20,
        match: /^\+?[0-9]{7,20}$/
    },
    status: {
        type: Boolean,
        required: true
    },
    date_joined: {
        type: Date,
        required: true,
        default: Date.now
    },
    fcmTokens: {
        type: [String],
        default: []
    }
},
    {
        timestamps: true
    }
);

export const User = mongoose.model("users", userSchema);

const chapterSchema = new mongoose.Schema({
    chapter_name: { type: String, required: true, maxlength: 100 },
    chapter_code: { type: String, required: true, maxlength: 20 },
    region_id: { type: mongoose.Schema.Types.ObjectId, ref: 'regions', required: true },
    meeting_day: { type: String, required: true, maxlength: 30 },
    meeting_time: { type: String, required: true },
    meeting_location: { type: String, required: true },
    meeting_address: { type: String, required: true },
    chapter_status: { type: Boolean, required: true },
    founded_date: { type: Date, required: true },
    max_members: { type: Number, required: true },
    current_member_count: { type: Number, required: true }
},
    {
        timestamps: true
    }
);

export const Chapter = mongoose.model('chapters', chapterSchema);

const { Schema, Types, Decimal128 } = mongoose;

const membershipSchema = new Schema(
    {
        user_id: {
            type: Types.ObjectId,
            ref: 'users',
            required: true,
            index: true
        },
        idno : {
            type : String,
            required : true,
            unique : true
        },
        chapter_id: {
            type: Types.ObjectId,
            ref: 'chapters',
            required: true,
            index: true
        },
        role: {
            type: String,
            required: true,
            maxLength: 50,
            trim: true
        },
        membership_status: {
            type: Boolean,
            required: true,
        },
        join_date: {
            type: Date,
            required: true
        },
        renewal_date: {
            type: Date,
            required: true
        },
        termination_date: {
            type: Date
        },
        termination_reason: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

export const Membership = mongoose.model('chapter_memberships', membershipSchema);

const chapterSummarySchema = new Schema(
    {
        chapter_id: {
            type: mongoose.Types.ObjectId,
            ref: 'chapters',
            required: true,
            index: true
        },
        period_year: {
            type: Number,
            required: true,
            min: 1900
        },
        period_month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        total_members: {
            type: Number,
            required: true,
            min: 0
        },
        active_members: {
            type: Number,
            required: true,
            min: 0
        },
        total_referrals: {
            type: Number,
            required: true,
            min: 0
        },
        total_business: {
            type: mongoose.Types.Decimal128,
            required: true,
            min: 0,
            get: v => (v ? parseFloat(v.toString()) : 0)
        },
        meetings_held: {
            type: Number,
            required: true,
            min: 0
        },
        average_attendance: {
            type: mongoose.Types.Decimal128,
            required: true,
            min: 0,
            get: v => (v ? parseFloat(v.toString()) : 0)
        },
        visitors_total: {
            type: Number,
            required: true,
            min: 0
        },
        new_members_joined: {
            type: Number,
            required: true,
            min: 0
        },
        members_terminated: {
            type: Number,
            required: true,
            min: 0
        },
        one_to_ones_total: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

chapterSummarySchema.index({ chapter_id: 1, period_year: 1, period_month: 1 }, { unique: true });

export const ChapterSummary = mongoose.model('chapter_statistics', chapterSummarySchema);

const eventSchema = new Schema({
    chapter_id: {
        type: Types.ObjectId,
        ref: 'chapters',
        required: true,
        index: true
    },
    event_title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 255
    },
    event_description: {
        type: String,
        trim: true
    },
    event_date: {
        type: Date,
        required: true
    },
    event_time: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    organizer_company: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    event_type: {
        type: String,
        required: true,
        enum: {
            values: ['weekly', 'monthly', 'others'],
            message: 'meeting status must be a valid type',
        },
        trim: true,
        maxLength: 50
    },
    event_status: {
        type: String,
        enum: {
            values: ['completed', 'upcoming', 'cancelled', 'inprogress'],
            message: 'meeting status must be a valid type',
        },
        required: true,
        trim: true,
        maxLength: 20
    },
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

eventSchema.index({ chapter_id: 1, event_date: -1 });

export const Event = mongoose.model('events', eventSchema);

const meetingSchema = new Schema(
    {
        chapter_id: {
            type: Types.ObjectId,
            ref: 'Chapter',
            required: true,
            index: true
        },
        meeting_date: {
            type: Date,
            required: true
        },
        meeting_time: {
            type: String,
            required: true,
            trim: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxLength: 200
        },
        meeting_type: {
            type: String,
            enum: {
                values: ['weekly', 'monthly', 'others'],
                message: 'meeting status must be a valid type',
            },
            required: true,
            trim: true,
            maxLength: 50
        },
        location: {
            type: String,
            required: true,
            trim: true
        },
        meeting_notes: {
            type: String,
            default: "",
            trim: true
        },
        duration: {
            type: Number,
            min: 0,
            required: true,
            default: 0
        },
        meeting_status: {
            type: String,
            enum: {
                values: ['completed', 'upcoming', 'cancelled', 'inprogress'],
                message: 'meeting status must be a valid type',
            },
            required: true,
            trim: true,
            maxLength: 20
        },
        attendance_status: {
            type: Boolean
        }
    },
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

meetingSchema.index({ chapter_id: 1, meeting_date: 1 });

export const Meeting = mongoose.model('meetings', meetingSchema);

const attendanceSchema = new Schema({
    user_id: {
        type: Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    meeting_id: {
        type: Types.ObjectId,
        ref: 'meetings',
        required: true,
        index: true
    },
    attendance_status: {
        type: String,
        required: true,
        trim: true,
        enum: {
            values: ['present', 'absent'],
            message: 'attendance_status must be a valid type ["present" , "absent"]',
        },
        maxLength: 20
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    }
},
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true }
    });

attendanceSchema.index({ user_id: 1, date: 1 });

export const Attendance = mongoose.model('attendance', attendanceSchema);

const performanceSchema = new Schema(
    {
        user_id: {
            type: Types.ObjectId,
            ref: 'users',
            required: true,
            index: true
        },
        chapter_id: {
            type: Types.ObjectId,
            ref: 'chapters',
            required: true,
            index: true
        },
        period_year: {
            type: Number,
            required: true
        },
        period_6month: {
            type: Number,
            required: true
        },
        period_month: {
            type: Number,
            required: true
        },
        referrals_given: {
            type: Number,
            required: true,
            min: 0
        },
        referrals_received: {
            type: Number,
            required: true,
            min: 0
        },
        business_given: {
            type: Decimal128,
            required: true,
            min: 0,
            get: v => v ? parseFloat(v.toString()) : 0
        },
        business_received: {
            type: Decimal128,
            required: true,
            min: 0,
            get: v => v ? parseFloat(v.toString()) : 0
        },
        meetings_attended: {
            type: Number,
            required: true,
            min: 0
        },
        one_to_ones_held: {
            type: Number,
            required: true,
            min: 0
        },
        visitors_brought: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

performanceSchema.index({ user_id: 1, chapter_id: 1, period_year: 1, period_6month: 1, period_month: 1 }, { unique: true });

export const Performance = mongoose.model('member_statistics', performanceSchema);

const NotificationSchema = new Schema(
    {
        receiver: {
            type: Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        sender: {
            type: Types.ObjectId,
            ref: 'User',
        },
        header: {
            type: String,
        },
        content: {
            type: String,
            required: true,
        },
        read: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export const Notification = mongoose.model('Notifications', NotificationSchema);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const profileSchema = new Schema(
    {
        display_name: {
            type: String,
            trim: true,
            maxlength: 50,
            default: null,
        },
        user_id: {
            type: Schema.Types.ObjectId,
            ref: 'users',
            required: true,
            index: true,
            unique: true,
        },
        chapter_id: {
            type: Schema.Types.ObjectId,
            ref: 'chapters',
            required: true,
        },
        region_id: {
            type: Schema.Types.ObjectId,
            ref: 'regions',
            required: true,
        },
        profile_image_url: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null,
        },
        company_phone: {
            type: String,
            trim: true,
            maxlength: 20,
            default: null,
        },
        company_email: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 100,
            match: [emailRegex, 'company_email must be a valid email'],
            default: null,
        },
        company_address: {
            type: String,
            trim: true,
            default: null,
        },
        personal_address: {
            type: String,
            trim: true,
            default: null,
        },
        dob: {
            type: Date,
            validate: {
                validator: v => !v || v <= new Date(),
                message: 'dob cannot be in the future',
            },
            default: null,
        },
        wedding_date: {
            type: Date,
            validate: {
                validator: v => !v || v <= new Date(),
                message: 'wedding_date cannot be in the future',
            },
            default: null,
        },
        blood_group: {
            type: String,
            trim: true,
            enum: {
                values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
                message: 'blood_group must be a valid type',
            },
            default: "A+",
        },
        vagai_category: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        kulam_category: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        native_place: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        kuladeivam: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        company_name: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },

        vertical_ids: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: 'verticals',
                },
            ],
            default: [],
        },

        years_in_business: {
            type: Number,
            min: [0, 'years_in_business cannot be negative'],
            default: null,
        },
        annual_turnover: {
            type: Number,
            min: [0, 'annual_turnover cannot be negative'],
            default: null,
        },
        website: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null,
        },

        services: {
            type: [String],
            validate: {
                validator: arr =>
                    !arr || arr.length === 0 || arr.every(s => typeof s === 'string' && s.trim().length > 0),
                message: 'services must be an array of non-empty strings',
            },
            default: [],
        },

        ideal_referral: {
            type: String,
            trim: true,
            default: null,
        },

        bio: {
            type: String,
            trim: true,
            default: null,
        },

        elevator_pitch_30s: {
            type: String,
            trim: true,
            default: null,
        },
        why_sib: {
            type: String,
            trim: true,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'profiles',
    }
);

export const MemberProfile = mongoose.model('profiles', profileSchema);

const oneToOneMeetingSchema = new Schema({
    member1_id: {
        type: Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    member2_id: {
        type: Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    chapter_id: {
        type: Types.ObjectId,
        ref: 'chapters',
        required: true,
        index: true
    },
    meeting_date: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true,
        trim: true,
        maxLength: 255
    },
    discussion_points: {
        type: String,
        trim: true
    },
    created_by: {
        type: Types.ObjectId,
        ref: 'users',
        required: true
    },
    status: {
        type: Boolean,
        required: true
    },
    image_url : {
        type: String,
        trim: true,
        reqired : true ,
        default : ''
    }
},
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

oneToOneMeetingSchema.index({ chapter_id: 1, meeting_date: -1 });

export const OneToOneMeeting = mongoose.model('one_to_one_meetings', oneToOneMeetingSchema);

const referralSchema = new Schema(
    {
        referrer_id: {
            type: Types.ObjectId,
            ref: "users",
            required: [true, "Referrer ID is required"],
            index: true
        },
        referee_id: {
            type: Types.ObjectId,
            ref: "users",
            required: [true, "Referee ID is required"],
            index: true
        },
        contact_name: {
            type: String,
            trim: true,
            maxlength: 100
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true
        },
        referral_type: {
            type: String,
            required: [true, "Referral type is required"],
            trim: true,
            maxlength: 20
        },
        referral_status: {
            type: [String],
            trim: true,
        },
        contact_phone: {
            type: String,
            required: [true, "Contact phone is required"],
            trim: true,
            maxlength: 20
        },
        contact_email: {
            type: String,
            trim: true,
            maxlength: 100,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please provide a valid email address"
            ]
        },
        contact_address: {
            type: String,
            trim: true,
            default: ""
        },
        comments: {
            type: String,
            trim: true,
            default: ""
        },
        hot: {
            type: String,
            required: [true, "Hot status is required"],
            trim: true,
            maxlength: 20
        },
        created_at: {
            type: Date,
            required: true,
            default: Date.now
        },
        status: {
            type: Boolean,
            required: true
        }
    },
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

export const Referral = mongoose.model("referrals", referralSchema);

const visitorSchema = new Schema({
    inviting_member_id: {
        type: Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    visitor_name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    visitor_company: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    visitor_phone: {
        type: String,
        required: true,
        trim: true,
        maxLength: 20
    },
    visitor_email: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    business_category: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    industry: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    presentation_given: {
        type: Boolean,
        required: true
    },
    follow_up_notes: {
        type: String,
        trim: true
    },
    converted_to_member: {
        type: Boolean,
        required: true
    },
    member_user_id: {
        type: Types.ObjectId,
        ref: 'users',
        default: null
    },
    status: {
        type: Boolean,
        required: true
    }
}, {
    timestamps: true
});

visitorSchema.index({ inviting_member_id: 1, visitor_email: 1 });

export const Visitor = mongoose.model('visitors', visitorSchema);

const tyftbSchema = new Schema({
    referral_id: {
        type: Types.ObjectId,
        ref: 'referrals',
        index: true
    },
    payer_id: {
        type: Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    receiver_id: {
        type: Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    business_type: {
        type: String,
        required: true,
        trim: true,
        maxLength: 50
    },
    referral_type: {
        type: String,
        required: true,
        trim: true,
        maxLength: 20
    },
    business_amount: {
        type: mongoose.Types.Decimal128,
        required: true,
        min: 0,
        get: v => (v ? parseFloat(v.toString()) : 0)
    },
    business_description: {
        type: String,
        trim: true
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: Boolean,
        required: true
    }
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

tyftbSchema.index({ payer_id: 1, receiver_id: 1, date_closed: -1 });

export const TYFTB = mongoose.model('tyftb', tyftbSchema);

const gallerySchema = new Schema({
    title: {
        type: String,
        required: true,
        maxlength: 255,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    coverImg: {
        type: String,
        trim: true
    },
    photos: {
        type: [String],
        default: []
    }
}, {
    timestamps: true,
    collection: 'galleries'
});

export const Gallery = mongoose.model('galleries', gallerySchema);


const earnedBadgeSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    chapter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'chapters', required: true },
    badge_type: { type: String, required: true }, // 'month_winner', 'runner_up', 'highest_referral', 'highest_tyb', 'highest_m2m', 'full_attendance'
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    awarded_at: { type: Date, default: Date.now }
}, { timestamps: true });

export const EarnedBadge = mongoose.model('EarnedBadge', earnedBadgeSchema);