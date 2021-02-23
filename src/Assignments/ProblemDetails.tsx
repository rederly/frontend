import React from 'react';
import { ProblemObject, TopicObject, StudentGrade, StudentTopicAssessmentFields } from '../Courses/CourseInterfaces';
import _ from 'lodash';
import moment from 'moment';
import { OverlayTrigger, Tooltip, Badge, Button } from 'react-bootstrap';
import { getUserRole, UserRole } from '../Enums/UserRole';
import { MomentReacter } from '../Components/MomentReacter';
import { useCurrentProblemState } from '../Contexts/CurrentProblemState';
import logger from '../Utilities/Logger';
import EmailProfessor from './EmailProfessor';
import localPreferences from '../Utilities/LocalPreferences';

const { topicPreferences } = localPreferences;

const INFINITE_MAX_ATTEMPT_VALUE = 0;

interface ProblemDetailsProps {
    problem: ProblemObject;
    topic: TopicObject | null;
    attemptsRemaining?: number | 'unlimited';
    setAttemptsRemaining?: React.Dispatch<React.SetStateAction<number | 'unlimited'>>;
    setOpenDrawer?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ProblemDetails: React.FC<ProblemDetailsProps> = ({
    problem,
    topic,
    attemptsRemaining,
    setAttemptsRemaining,
    setOpenDrawer,
}) => {
    if (_.isNil(topic)) {
        logger.error('Problem details requested without a topic');
    }

    let version: StudentTopicAssessmentFields | undefined;

    if (
        !_.isNil(topic) &&
        !_.isNil(topic.topicAssessmentInfo) &&
        !_.isEmpty(topic?.topicAssessmentInfo?.studentTopicAssessmentInfo)
    ) {
        version = _.maxBy(topic.topicAssessmentInfo.studentTopicAssessmentInfo, 'startTime');
        if (_.isNil(version)) {
            logger.error('We have versions, but an attempt to set the current version failed.');
        }
    }

    const isVersionedAssessment = (topic?.topicTypeId === 2 && !_.isNil(version));
    let isClosed = false;
    let versionStartTime: Date | undefined;
    let versionEndTime: Date | undefined;

    if (!_.isNil(version)) {
        isClosed = isVersionedAssessment && !_.isNil(version.isClosed) && version.isClosed;
        versionStartTime = version.startTime;
        versionEndTime = version.endTime;
    }

    const startDate = (_.isNil(versionStartTime)) ? moment(topic?.startDate) : moment(versionStartTime);
    const endDate = (_.isNil(versionEndTime)) ? moment(topic?.endDate) : moment(versionEndTime);
    const deadDate = (_.isNil(versionEndTime)) ? moment(topic?.deadDate) : moment(versionEndTime);
    const solutionsMoment = (_.isNil(versionEndTime)) ? moment(deadDate).add(1, 'days') : moment(versionEndTime);

    const grade: StudentGrade | undefined = problem.grades?.[0];
    const {lastSavedAt, lastSubmittedAt} = useCurrentProblemState();

    const maxAttempts = problem?.maxAttempts;
    const usedAttempts = grade?.numAttempts;

    if (_.isNil(topic)) {
        return (<p>An error occurred.</p>);
    }

    return (
        <div>
            <div className="d-flex flex-row">
                <h2>{topic?.name}</h2>
                <OverlayTrigger
                    placement="top"
                    delay={{ show: 250, hide: 400 }}
                    overlay={(props: any) => (
                        <Tooltip id="dates-tooltip" {...props}>
                            <strong>Started</strong> on {startDate.format('LLLL')} <br />
                            <strong>Due</strong> on {endDate.format('LLLL')} <br />
                            <MomentReacter
                                significantMoments={[endDate]}
                                stopMoment={deadDate}
                                logTag='partialCreditDateAvailable'
                            >
                                {(currentMoment) => {
                                    if ((getUserRole() === UserRole.PROFESSOR || currentMoment.isAfter(endDate)) && !deadDate.isSame(endDate)) {
                                        return (
                                            <>
                                                <strong>Can receive partial credit</strong> until {deadDate.format('LLLL')} <br />
                                            </>
                                        );
                                    }
                                    return <></>;
                                }}
                            </MomentReacter>
                        </Tooltip>
                    )}
                >
                    <div style={{
                        marginTop: 'auto',
                        marginLeft: '8px',
                        marginBottom: '8px',
                    }}>
                        <MomentReacter
                            intervalInMillis={1000}
                            stopMoment={solutionsMoment} // Once solutions are available this timer means nothing
                            significantMoments={[endDate, deadDate, solutionsMoment]}
                            logTag='dueMessage'
                        >
                            {(currentMoment: moment.Moment) => {
                                let message = '';
                                const formatKey = topicPreferences.useSeconds ? 'formattedFromNow': 'fromNow';
                                if (currentMoment.isBefore(endDate) && (_.isNil(attemptsRemaining) || ((attemptsRemaining === 'unlimited' || attemptsRemaining > 0) && !isClosed))) {
                                    message = `Due ${endDate[formatKey]()}`;
                                } else if (currentMoment.isBefore(deadDate) && (_.isNil(attemptsRemaining) || (attemptsRemaining > 0 && !isClosed))) {
                                    message = `Partial credit expires ${deadDate[formatKey]()}`;
                                } else if (currentMoment.isBefore(solutionsMoment) && (_.isNil(attemptsRemaining) || (attemptsRemaining > 0 && !isClosed))) {
                                    message = `Solutions available ${solutionsMoment[formatKey]()}`;
                                } else if (currentMoment.isAfter(solutionsMoment)) {
                                    message = (isVersionedAssessment) ? 'Time expired for this version' : 'Past due';
                                    if (isVersionedAssessment) setAttemptsRemaining?.(0);
                                } else {
                                    message = 'is completed';
                                }

                                return (<>{message}</>);
                            }}
                        </MomentReacter>
                    </div>
                </OverlayTrigger>
                <Button
                    style={{ marginLeft: 'auto' }}
                    onClick={()=>setOpenDrawer?.(true)}
                    disabled={_.isNil(setOpenDrawer)}
                    title={_.isNil(setOpenDrawer) ? 'You must be enrolled in this course to upload attachments.' : 'Click here to open the Attachments sidebar.'}
                >
                    Attach Work
                </Button>
                <EmailProfessor topic={topic} problem={problem} />
                <div style={{ marginLeft: '1em' }}>
                    <Badge pill variant="dark">
                        {problem.id}{_.isNil(grade) ? '' : `-${grade.id}`}
                    </Badge>
                </div>
            </div>
            <div className="d-flex">
                { !isVersionedAssessment &&
                    <div className="d-flex flex-column">
                        <div className="d-flex">
                            <OverlayTrigger
                                placement="top"
                                delay={{ show: 250, hide: 400 }}
                                overlay={(props: any) => {
                                    let message = null;
                                    if (_.isNil(maxAttempts) || _.isNil(usedAttempts)) {
                                        message = 'Students would see information about how many submissions they have used here';
                                    } else if (maxAttempts > INFINITE_MAX_ATTEMPT_VALUE) {
                                        message = `You have used ${usedAttempts} of ${maxAttempts} graded submissions`;
                                    } else {
                                        message = `You have submitted this problem ${usedAttempts} time${usedAttempts === 1 ? '' : 's'}`;
                                    }
                                    return (
                                        <Tooltip id="attempts-tooltip" {...props}>
                                            {message}
                                        </Tooltip>
                                    );
                                }}
                            >
                                <div>
                                    {(() => {
                                        if (_.isNil(maxAttempts)) {
                                            return null;
                                        }

                                        if (maxAttempts <= INFINITE_MAX_ATTEMPT_VALUE) {
                                            return 'This question does not have an attempt limit.';
                                        } else {
                                            if (_.isNil(usedAttempts)) {
                                                return `This problem allows ${maxAttempts} submission${maxAttempts === 1 ? '' : 's'}.`;
                                            }
                                            const remainingAttempts = maxAttempts - usedAttempts;
                                            return `You have ${Math.max(remainingAttempts, 0)} graded submission${remainingAttempts === 1 ? '' : 's'} remaining.`;
                                        }
                                    })()}
                                </div>
                            </OverlayTrigger>
                        </div>
                        <div className="d-flex">
                            {(() => {
                                if (_.isNil(problem)) {
                                    return null;
                                }
                                if (problem.weight > 0) {
                                    // has weight (and maybe optional)
                                    return `This problem is worth ${problem.weight}${problem.optional ? ' extra credit' : ''} point${problem.weight === 1 ? '' : 's'}.`;
                                } else if (problem.optional) {
                                    // optional and no weight
                                    return 'This problem is optional.';
                                }
                            })()}
                        </div>
                        {_.isNil(grade) ? null : (
                            <>
                                <div className="d-flex">
                                    Your recorded score for this problem is {(grade.effectiveScore * 100).toFixed(1)}%.
                                </div>
                                {grade.effectiveScore === grade.overallBestScore ? null : (
                                    <div className="d-flex">
                                        Your best attempt for this problem is {(grade.overallBestScore * 100).toFixed(1)}%.
                                    </div>
                                )}
                            </>
                        )}
                        <div className="d-flex">
                            <MomentReacter
                                significantMoments={[endDate, deadDate, solutionsMoment]}
                                stopMoment={solutionsMoment} // Once solutions are available this timer means nothing
                                logTag='gradedMessage'
                            >
                                {(currentMoment) => {
                                    // TODO move this logic to a utility function that is shared between the backend and front end
                                    // initially I was thinking the backend would send it, however it has to react to the current time so it probably would be better in a shared module
                                    const applicationError = 'An unknown error has occurred and it is unclear if your submissions will be graded.';
                                    let message = null;
                                    if (_.isNil(problem)) {
                                        // The user should never see this
                                        // TODO maybe problem shouldn't be able to be null?
                                        message = applicationError;
                                    }
                                    // ******************** NOT RECORDING ********************
                                    else if (_.isNil(grade)) {
                                        if (getUserRole() === UserRole.STUDENT) {
                                            message = 'This problem is not eligible for a grade. Your submissions will not be recorded.';
                                        } else {
                                            // Professors will not have a grade so this is an expected result
                                            return (<></>);
                                        }
                                    } else if (grade.overallBestScore >= 1) {
                                        message = 'You have completed this problem. Your submissions will no longer be recorded.';
                                    } else if (currentMoment.isAfter(solutionsMoment)) {
                                        // TODO get solutionsMoment from backend
                                        message = 'Solutions are available, your submissions will not be recorded.';
                                    }
                                    // ******************** RECORDING BUT NOT UPDATING GRADE \/\/\/\/********************
                                    else if (grade.locked === true) {
                                        message = 'Your grade on this problem has been locked. Your submissions will be recorded but your grade will not update. Contact your professor if you think this is an error.';
                                    } else if (problem.maxAttempts > 0 && grade.numAttempts >= problem.maxAttempts) {
                                        message = 'You have exceeded the attempt limit. Your submissions on this problem will not be graded but will count toward completion.';
                                    } else if (currentMoment.isBefore(solutionsMoment) && currentMoment.isAfter(deadDate)) {
                                        message = 'The topic is past due. Your submissions on this problem will not be graded but will count toward completion.';
                                    }
                                    // ******************** RECORDING AND UPDATING GRADE (PARTIAL CREDIT) \/\/\/\/********************
                                    else if (currentMoment.isBefore(deadDate) && currentMoment.isAfter(endDate)) {
                                        message = 'The topic is past due but partial credit is available. Your submissions will be graded with a penalty.';
                                    // ******************** RECORDING AND UPDATING GRADE \/\/\/\/********************
                                    } else if (grade.overallBestScore < 1 && currentMoment.isBefore(endDate) && (grade.numAttempts < problem.maxAttempts || problem.maxAttempts <= INFINITE_MAX_ATTEMPT_VALUE)) {
                                        // All of these situations should already be handled, just making it more defensive
                                        message = 'Your submissions on this problem will be graded.';
                                    }
                                    // ******************** APPLICATION ERROR \/\/\/\/********************
                                    else {
                                        // TODO remote error logging
                                        message = applicationError;
                                    }
                                    return (<>{message}</>);
                                }}
                            </MomentReacter>
                        </div>
                    </div>
                }
                <div className="d-flex flex-column flex-grow-1 align-items-end">
                    {lastSavedAt && <div className='d-flex text-success'>Last saved on {lastSavedAt.format('MMMM Do YYYY, h:mm:ss a')}</div>}
                    {lastSubmittedAt && <div className='d-flex text-success'>Last submitted on {lastSubmittedAt.format('MMMM Do YYYY, h:mm:ss a')}</div>}
                </div>
            </div>
        </div>
    );
};
