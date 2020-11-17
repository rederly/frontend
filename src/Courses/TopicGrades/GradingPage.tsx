import { Button, Grid } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import _ from 'lodash';
import { Link, useParams } from 'react-router-dom';
import logger from '../../Utilities/Logger';
import MaterialBiSelect from '../../Components/MaterialBiSelect';
import { useCourseContext } from '../CourseProvider';
import { UserObject, TopicObject, ProblemObject, StudentGrade, StudentGradeInstance, ProblemState } from '../CourseInterfaces';
import ProblemIframe from '../../Assignments/ProblemIframe';
import { getTopic } from '../../APIInterfaces/BackendAPI/Requests/CourseRequests';
import { GradeInfoHeader } from './GradeInfoHeader';
import { useQuery } from '../../Hooks/UseQuery';
import AttachmentsPreview from './AttachmentsPreview';

interface TopicGradingPageProps {
    topicId?: string;
    courseId?: string;
}

interface VersionInfo {
    studentTopicAssessmentInfoId: number;
    endTime: Date;
}

export const TopicGradingPage: React.FC<TopicGradingPageProps> = () => {
    enum Pin {
        STUDENT,
        PROBLEM
    } 
    const params = useParams<TopicGradingPageProps>();
    const {users} = useCourseContext();
    const queryParams = useQuery();
    const [error, setError] = useState<string | null>(null);
    const [isPinned, setIsPinned] = useState<Pin | null>(null); // pin one or the other, not both
    const [topic, setTopic] = useState<TopicObject | null>(null);
    const [problems, setProblems] = useState<ProblemObject[] | null>(null);
    const [selected, setSelected] = useState<{
        problem?: ProblemObject, 
        user?: UserObject,
        problemState?: ProblemState,
        grade?: StudentGrade,
        gradeInstance?: StudentGradeInstance,
    }>({});

    useEffect(() => {
        logger.debug('GradingPage: topicId changed');
        (async () => {
            try {
                if (_.isNil(params.topicId)) {
                    logger.error('topicId is null');
                    throw new Error('An unexpected error has occurred');
                } else {
                    await fetchProblems(parseInt(params.topicId, 10));
                }
            } catch (e) {
                logger.error(e.message, e);
            }
        })();
    }, [params.topicId, users]);

    const fetchProblems = async (topicId: number) => {
        // fetchProblems is only called when topicId changes ()
        const res = await getTopic({ id: topicId, includeQuestions: true });
        const currentProblems = _(res.data.data.questions)
            .map((p) => { return new ProblemObject(p); })
            .sortBy(['problemNumber'], ['asc'])
            .value();
        // currentProblems = _.map(currentProblems, (p) => {return new ProblemObject(p);});
        setProblems(currentProblems);

        const currentTopic = res.data.data as TopicObject;
        setTopic(currentTopic);

        const problemIdString = queryParams.get('problemId');
        let initialSelectedProblem: ProblemObject | undefined;

        const userIdString = queryParams.get('userId');
        let initialSelectedUser: UserObject | undefined;

        if (!_.isEmpty(currentProblems)) {
            if (_.isNil(problemIdString)) {
                initialSelectedProblem = currentProblems[0];
            } else {
                const initialSelectedProblemId = parseInt(problemIdString, 10);
                initialSelectedProblem = _.find(currentProblems, ['id', initialSelectedProblemId]);
                logger.debug(`GP: attempting to set intial user #${initialSelectedProblemId}`);
            }
        }
        if (!_.isEmpty(users)) {
            if (_.isNil(userIdString)) {
                const initialSelectedUserId = _.sortBy(users, ['lastName'], ['desc'])[0].id;
                initialSelectedUser = _.find(users, { 'id': initialSelectedUserId });
            } else {
                const initialSelectedUserId = parseInt(userIdString, 10);
                initialSelectedUser = _.find(users, {'id': initialSelectedUserId});
                logger.debug(`GP: attempting to set intial user #${initialSelectedUserId}`);
            }
        }
        setSelected({ user: initialSelectedUser, problem: initialSelectedProblem});
    };

    if (!_.isNil(error)) {
        return (
            <h3>{error}</h3>
        );
    }

    return (
        <Grid>
            <Grid container spacing={1} alignItems='center'>
                <Grid item className='text-left'>
                    <h1>Grading {topic && topic.name}</h1>
                </Grid>
                <Grid item>
                    {selected.problemState?.studentTopicAssessmentInfoId && 
                        <Link 
                            to={path => `${path.pathname}/print/${selected.user?.id}`}
                            target="_blank" rel='noopener noreferrer'
                        >
                            <Button variant='contained' color='primary'>Export/Print</Button>
                        </Link>}
                </Grid>
            </Grid>
            <Grid container spacing={1}>
                <Grid container item md={4}>
                    {problems && users &&
                        <MaterialBiSelect problems={problems} users={users} selected={selected} setSelected={setSelected} />
                    }
                </Grid>
                <Grid container item md={8} style={{paddingLeft: '1rem', height: 'min-content'}}>
                    { selected.user && selected.problem && topic && 
                        < GradeInfoHeader
                            selected={selected}
                            setSelected={setSelected}
                            topic={topic}
                        />
                    }
                    <Grid container alignItems='stretch'>
                        {selected.problem && selected.user && selected.grade &&
                        // (selected.problemState?.workbookId || selected.problemState?.studentTopicAssessmentInfoId || selected.problemState?.previewPath) && 
                            < ProblemIframe
                                problem={selected.problem}
                                userId={selected.user.id}
                                readonly={true}
                                workbookId={selected.problemState?.workbookId}
                                studentTopicAssessmentInfoId={selected.problemState?.studentTopicAssessmentInfoId}
                                previewPath={selected.problemState?.previewPath}
                                previewSeed={selected.problemState?.previewSeed}
                            />
                        }
                    </Grid>
                    {(selected.grade || selected.gradeInstance) && 
                        <Grid container item md={12}>
                            <AttachmentsPreview 
                                gradeId={selected?.grade?.id}
                                gradeInstanceId={selected?.gradeInstance?.id}
                                // Workbooks don't seem to be loading in the database right now,
                                // but a professor shouldn't really care about this level. Attachments should show the same for
                                // all attempts, maybe even all versions?
                                // workbookId={selected.workbook?.id} 
                            /> 
                        </Grid>
                    }
                </Grid>
            </Grid>
        </Grid>
    );
};

export default TopicGradingPage;