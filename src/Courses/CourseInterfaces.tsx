import _ from 'lodash';
import moment from 'moment';

export function* uniqueGen() {
    let index: number = 0;

    while (true) {
        yield ++index;
    }
}

// via 1loc.dev (consider moving to a utilities folder)
const generateString = (length: number): string => Array(length).fill('').map(() => Math.random().toString(36).charAt(2)).join('');

export class CourseObject {
    name: string = '';
    start: Date = new Date();
    end: Date = new Date();
    sectionCode: string = '';
    semesterCode: string = 'SPRING';
    semesterCodeYear: number = 2021;
    id: number = 0;
    units: Array<UnitObject> = [];
    code: string = '';
    curriculumId: number = 0;
    textbooks: string = '';
    canAskForHelp: boolean = false;

    public constructor(init?:Partial<CourseObject>) {
        Object.assign(this, init);

        if (!_.isNull(init?.units)) {
            this.units = init?.units?.map(unit => new UnitObject(unit)) || [];
        }

        if(_.isNil(init?.semesterCodeYear) && !_.isNil(init?.semesterCode)) {
            const semesterCodeRegex = /^(.*?)(\d+)$/;
            // init cannot be nil from the if statement above
            const [, group1, group2] = semesterCodeRegex.exec(init?.semesterCode ?? '') || [];
            this.semesterCode = group1;
            this.semesterCodeYear = parseInt(group2);
        }
    }

    static toAPIObject(course: CourseObject) {
        // Not every field belongs in the request.
        const newCourseFields = ['curriculum', 'name', 'code', 'start', 'end', 'sectionCode', 'semesterCode', 'textbooks', 'curriculumId'];
        const postObject = _.pick(course, newCourseFields);
        postObject.semesterCode = `${course.semesterCode}${course.semesterCodeYear}`;
        postObject.code = `${postObject.sectionCode}_${postObject.semesterCode}_${generateString(4).toUpperCase()}`;
        // TODO: Fix naming for route, should be 'templateId'.
        return postObject;
    }

    findUnit = (unitId: number): UnitObject | undefined => _.find(this.units, ['id', unitId]);
    findTopic = (topicId: number): TopicObject | undefined => _.reduce(this.units, (accum: TopicObject | undefined, unit) => accum || _.find(unit.topics, ['id', topicId]), undefined);
}

export class UserObject {
    firstName?: string;
    lastName?: string;
    id: number = -1;
    universityId?: number;

    get name(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    public constructor(init?:Partial<UserObject>) {
        Object.assign(this, init);
    }
}

/**
 * Course templates are previous courses or curriculum.
 */
export interface ICourseTemplate {
    name: string;
    id: number;
    comment: string;
}

export interface IProblemObject {
    path: string;
    weight: number;
}

export enum TopicTypeId {
    PROBLEM_SET = 1,
    EXAM = 2
}

export class TopicAssessmentFields {
    id?: number;
    duration?: number;
    hardCutoff?: boolean;
    maxGradedAttemptsPerVersion?: number;
    maxVersions?: number;
    versionDelay?: number;
    hideHints?: boolean;
    showItemizedResults?: boolean;
    showTotalGradeImmediately?: boolean;
    hideProblemsAfterFinish?: boolean;
    randomizeOrder?: boolean;
    studentTopicAssessmentInfo?: Array<StudentTopicAssessmentFields>;
    studentTopicAssessmentOverride?: StudentTopicAssessmentOverrideFields[];

    public constructor(init?:Partial<TopicAssessmentFields>) {
        Object.assign(this, init);
    }

    static getDefaultFields = (): Partial<TopicAssessmentFields> => {
        return {
            duration: 60,
            hardCutoff: false,
            maxGradedAttemptsPerVersion: 1,
            maxVersions: 1,
            versionDelay: 0,
            hideHints: false,
            showItemizedResults: false,
            showTotalGradeImmediately: false,
            hideProblemsAfterFinish: false,
            randomizeOrder: false,
        };
    }
}

export class StudentTopicAssessmentOverrideFields {
    // TODO fixed truncated fields from backend
    topicAssessm?: number;
    // maxGradedAtt?: number;
    maxGradedAttemptsPerVersion?: number;
    id?: number;
    userId?: number;
    duration?: number;
    maxVersions?: number;
    versionDelay?: number;
    active?: boolean;
    createdAt?: Date;
    updatedAt?: Date;

    public constructor(init?:Partial<StudentTopicAssessmentOverrideFields>) {
        Object.assign(this, init);
    }
}

export class StudentTopicAssessmentFields {
    id?: number;
    topicAssessmentInfoId?: number;
    userId?: number;
    startTime?: Date;
    endTime?: Date;
    nextVersionAvailableTime?: Date;
    numAttempts?: number;
    maxAttempts?: number;
    isClean?: boolean;
    isClosed?: boolean;
    active?: boolean;

    public constructor(init?: Partial<StudentTopicAssessmentFields>) {
        Object.assign(this, init);
    }
}

export class TopicOverride {
    id?: number;
    userId?: number;
    startDate?: Date;
    endDate?: Date;
    deadDate?: Date;
}

const newTopicUniqueGen = uniqueGen();
export class TopicObject {
    name: string = '';
    questions: Array<ProblemObject> = [];
    curriculumUnitContentId: number = 0;
    topicTypeId: TopicTypeId = TopicTypeId.PROBLEM_SET;
    id: number = 0;
    unique: number = newTopicUniqueGen.next().value || 0;
    contentOrder: number = 0;
    courseUnitContentId: number = 0;
    startDate: Date = new Date();
    endDate: Date = new Date();
    deadDate: Date = new Date();
    partialExtend: boolean = false;
    studentTopicOverride: TopicOverride[] = [];
    topicAssessmentInfo?: TopicAssessmentFields = new TopicAssessmentFields();
    errors: number = 0;
    unit?: UnitObject;

    public constructor(init?:Partial<TopicObject>) {
        Object.assign(this, init);

        if (!_.isNull(init?.questions)) {
            this.questions = init?.questions?.map(question => new ProblemObject(question)) || [];
        }
    }

    // TODO: Topics should not return overrides when students are asking, which would allow
    // us to remove this argument.
    getActiveExtensions = (userId?: number): Array<TopicOverride> => {
        const now = moment();
        if (_.isEmpty(this.studentTopicOverride)) return [];

        const activeExtensions: TopicOverride[] = this.studentTopicOverride.reduce((accum: TopicOverride[], extension) => {
            if ( now.isBetween(extension.startDate, extension.deadDate, 'day', '[]') &&
               ( _.isNil(userId) || extension.userId === userId )) {
                accum.push(extension);
            }
            return accum;
        }, []);

        return _.sortBy(activeExtensions, ['endDate', 'startDate']);
    };

    hasEverBeenActive = (): boolean => {
        if (moment().isAfter(moment(this.startDate))) return true;
        return _.some(this.studentTopicOverride, extension => moment().isAfter(moment(extension.startDate)));
    }

    isExam = (): boolean => this.topicTypeId === TopicTypeId.EXAM;
    
    findProblem = (problemId: number): ProblemObject | undefined => _.find(this.questions, ['id', problemId]);
}

const newUnitUniqueGen = uniqueGen();
export class UnitObject {
    id: number = 0;
    name: string = '';
    curriculumId: number = 0;
    topics: Array<TopicObject> = [];
    unique: number = newUnitUniqueGen.next().value || 0;
    contentOrder: number = 0;
    courseId: number = 0;
    course?: CourseObject;

    public constructor(init?:Partial<UnitObject>) {
        Object.assign(this, init);

        if (!_.isNull(init?.topics)) {
            this.topics = init?.topics?.map(topic => new TopicObject(topic)) || [];
        }
    }

    findTopic = (topicId: number) => _.find(this.topics, ['id', topicId]);
}

export class NewCourseUnitObj extends UnitObject {
}

export interface StudentWorkbookInterface {
    id: number;
    active: boolean;
    studentGradeId: number;
    userId: number;
    courseWWTopicQuestionId: number;
    studentGradeInstanceId?: number;
    randomSeed: number;

    // This is a jsonb field so it could be any (from db)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitted: any;
    result: number;
    time: Date;
    wasLate: boolean;
    wasExpired: boolean;
    wasAfterAttemptLimit: boolean;
    wasLocked: boolean;
    wasAutoSubmitted: boolean;

    createdAt: Date;
    updatedAt: Date;

    // This is a custom field that describes the workbook as a function
    // of version and attempt.
    workbookDescriptor?: string;
}

export interface StudentGradeInstance {
    id: number;
    webworkQuestionPath: string;
    problemNumber: number;
    randomSeed: number;
    // This is a jsonb field so it could be any (from db)
    // Submitted in workbook used any so I'm going to keep it consistent here
    // If this is used for form data we will never know any info about what keys are available
    // Might make sense to make this an unknown type since I don't think we will ever access the types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentProblemState: any;
    studentGradeId: number;
    studentTopicAssessmentInfoId: number;
    scoreForBestVersion: number; // the score from the highest-scoring exam submission
    overallBestScore: number; // the best score on this problem alone
    active: boolean;
    bestIndividualAttemptId: number;
    bestVersionAttemptId: number;
}

export interface StudentGradeDict {
    id: number;
    userId: number;
    randomSeed: number;
    overallBestScore: number;
    effectiveScore: number;
    bestScore: number;
    legalScore: number;
    partialCreditBestScore: number;
    numAttempts: number;
    numLegalAttempts: number;
    locked: boolean;
    lastInfluencingAttemptId?: number;
    workbooks?: Record<number, StudentWorkbookInterface>;
    overrides?: number;
}

export class StudentGrade {
    gradeInstances?: StudentGradeInstance[];
    workbooks?: StudentWorkbookInterface[];
    bestScore: number = 0; // should be deprecated?
    overallBestScore: number = 0;
    effectiveScore: number = 0;
    partialCreditBestScore: number = 0;
    legalScore: number = 0;
    numAttempts: number = 0;
    numLegalAttempts: number = 0;
    locked: boolean = false;
    currentProblemState?: unknown;
    id?: number;
    userId?: number;
    randomSeed?: number;
    // Updated with legalScore
    lastInfluencingLegalAttemptId?: number;
    // Updated with partialCreditBestScore
    lastInfluencingCreditedAttemptId?: number;
    // Updated with overallBestScore
    lastInfluencingAttemptId?: number;
    // for tracking saved inputs
    hasBeenSaved?: boolean;

    public constructor(init?:Partial<ProblemObject>) {
        Object.assign(this, init);
    }
}

export interface CourseTopicQuestionErrors {
    [path: string]: string[];
}

const newProblemUniqueGen = uniqueGen();
export class ProblemObject implements IProblemObject {
    id: number = 0;
    courseTopicContentId: number = 0;
    problemNumber: number = 1;
    webworkQuestionPath: string = ''; // This is the same as path, currently.
    path: string = '';
    weight: number = 1;
    maxAttempts: number = 3;
    hidden: boolean = false;
    optional: boolean = false;
    unique: number = newProblemUniqueGen.next().value || 0;
    grades?: StudentGrade[];
    smaEnabled?: boolean;
    topic?: TopicObject;
    
    studentTopicQuestionOverride: any[] = [];
    courseQuestionAssessmentInfo?: {
        additionalProblemPaths?: Array<string>;
        randomSeedSet?: number[];
        errors?: CourseTopicQuestionErrors | null;
    }
    rendererData?: any;
    errors: CourseTopicQuestionErrors | null = null;

    public constructor(init?:Partial<ProblemObject>) {
        Object.assign(this, init);
    }
}

export type SettingsComponentType = UnitObject | UserObject | TopicObject | ProblemObject;

export class CourseTopicAssessmentInfo extends TopicObject {
    duration?: number;
    hardCutoff?: boolean;
    maxGradedAttemptsPerRandomization?: number;
    maxReRandomizations?: number;
    randomizationDelay?: number;
    hideHints?: boolean;
    showItemizedResults?: boolean;
    showTotalGradeImmediately?: boolean;
    hideProblemsAfterFinish?: boolean;
    randomizeOrder?: boolean;

    public constructor(init?:Partial<CourseTopicAssessmentInfo>) {
        super(init);
        Object.assign(this, init);
    }
}

export interface ExamSettingsFields {
    topicAssessmentInfo?: {
        hardCutoff?: boolean;
        hideHints?: boolean;
        showItemizedResults?: boolean;
        showTotalGradeImmediately?: boolean;
        hideProblemsAfterFinish?: boolean;
        duration?: number;
        maxGradedAttemptsPerRandomization?: number;
        maxReRandomizations?: number;
        randomizationDelay?: number;
        randomizeOrder?: boolean;
    },
}

export interface ExamProblemSettingsFields {
    courseQuestionAssessmentInfo?: {
        additionalProblemPaths?: Array<{path: string}>,
        randomSeedSet?: number[],
    }
}

export class ProblemAttachments {
    id?: number;
    cloudFilename?: string;
    userLocalFilename?: string;
    active?: boolean;
    createdAt?: Date;
    updatedAt?: Date;

    // When created on the frontend, the File object contains the file that was uploaded.
    file?: File;
    progress!: number;

    public constructor(init?:Partial<ProblemAttachments>) {
        Object.assign(this, init);

        // If Backend-specific properties are filled, treat as already uploaded.
        if (_.isNil(init?.progress)) {
            this.progress = _.isNil(init?.id) ? 0 : 100;
        }
    }
}

export interface ProblemState {
    studentTopicAssessmentInfoId?: number;
    workbookId?: number;
    previewPath?: string;
    previewSeed?: number;
}
