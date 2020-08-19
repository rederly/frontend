import React, { useState, useCallback, useEffect } from 'react';
import { FormControl, FormLabel, Form, FormGroup, Modal, Button, InputGroup, Col, Row, FormCheck } from 'react-bootstrap';
import _ from 'lodash';
import { ProblemObject, NewCourseTopicObj } from '../CourseInterfaces';
import moment from 'moment';
import { useDropzone } from 'react-dropzone';
import AxiosRequest from '../../Hooks/AxiosRequest';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import MomentUtils from '@date-io/moment';
import { DateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import { MaterialUiPickersDate } from '@material-ui/pickers/typings/date';
import { FaTrash } from 'react-icons/fa';

interface TopicCreationModalProps {
    unitIndex: number;
    addTopic: (unitIndex: number, existingTopic: NewCourseTopicObj | null | undefined, topic: NewCourseTopicObj) => void;
    existingTopic?: NewCourseTopicObj;
}

/**
 * Topics are either a list of problems/weights, or a DEF file.
 * NOTE: The ProblemObject.problemNumber doesn't mean anything on this page, because it's going
 * to be set based on its position in the `problems` array.
 */
export const TopicCreationModal: React.FC<TopicCreationModalProps> = ({ unitIndex, addTopic, existingTopic }) => {
    const [topicMetadata, setTopicMetadata] = useState<NewCourseTopicObj>(new NewCourseTopicObj(existingTopic));
    const [problems, setProblems] = useState<Array<ProblemObject>>(existingTopic ? existingTopic.questions : []);
    const webworkBasePath = 'webwork-open-problem-library/';

    useEffect(() => {
        const isSorted = problems.slice(1).every((prob, i) => problems[i].problemNumber <= prob.problemNumber);

        if (!isSorted) {
            setProblems(_.sortBy(problems, ['problemNumber']));
        }
    }, [problems]);

    /**
     * Handles state for input for each problem.
     * @param index  - The index of the FormGroup generated.
     * @param name   - The name of the form element to be updated.
     * @param e      - The event object.
     * */
    const onFormChange = async (index: number, name: keyof ProblemObject, e: any) => {
        let val = e.target.value;
        let probs = [...problems];

        // TODO: Handle validation.
        switch (name) {
        case 'webworkQuestionPath':
        case 'path':
            probs[index].webworkQuestionPath = val;
            break;
        case 'weight':
        case 'maxAttempts':
        case 'problemNumber':
        case 'id':
            probs[index][name] = parseInt(val, 10);
            break;
        case 'optional':
            probs[index][name] = e.target.checked;
            break;
        case 'unique':
            break;
        default:
            probs[index][name] = val;
        }

        setProblems(probs);
    };

    const onFormBlur = async (index: number, name: keyof ProblemObject, e: any) => {
        const key = name === 'path' ? 'webworkQuestionPath' : name;
        // const initialValue = problems[index][key];
        let val = e.target.value;
        let probs = [...problems];

        // TODO: Handle validation.
        switch (name) {
        case 'webworkQuestionPath':
        case 'path':
            probs[index].webworkQuestionPath = val;
            break;
        case 'weight':
        case 'maxAttempts':
        case 'problemNumber':
        case 'id':
            val = parseInt(val, 10);
            probs[index][name] = val;
            break;
        case 'optional':
            val = e.target.checked;
            probs[index][name] = val;
            break;
        case 'unique':
            break;
        default:
            probs[index][name] = val;
        }

        // TODO prevent updates if nothing changed
        // The problem here is that we update the state before we update the backend
        // if (probs[index][name] === initialValue) {
        //     return;
        // }
        await AxiosRequest.put(`/courses/question/${probs[index].id}`, {
            [key]: val
        });

        setProblems(probs);
    };

    const deleteProblem = async (problemId: number) => {
        await AxiosRequest.delete(`/courses/question/${problemId}`);
        let newProblems = [...problems];
        newProblems = _.reject(newProblems, ['id', problemId]);
        setProblems(newProblems);
    };

    const deleteProblemClick = (event: React.KeyboardEvent<HTMLSpanElement> | React.MouseEvent<HTMLSpanElement, MouseEvent>, problemId: number) => {
        event.stopPropagation();
        deleteProblem(problemId);
    };

    const addProblemRows = (problem: ProblemObject, count: number): any => {
        const onFormChangeProblemIndex = _.curry(onFormChange)(count);
        const onFormBlurProblemIndex = _.curry(onFormBlur)(count);
        return (
            <Draggable draggableId={`problemRow${problem.id}`} index={problem.problemNumber} key={`problem-row-${problem.id}`}>
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                        <Row>
                            <Col>
                                <h4>Problem #{problem.problemNumber}</h4>
                            </Col>
                            <Col
                                style={{
                                    textAlign: 'end'
                                }}
                            >
                                <span
                                    role="button"
                                    tabIndex={0}
                                    style={{
                                        padding: '6px'
                                    }}
                                    onClick={_.partial(deleteProblemClick, _, problem.id)}
                                    onKeyPress={_.partial(deleteProblemClick, _, problem.id)}
                                >
                                    <FaTrash color='#AA0000' />
                                </span>
                            </Col>
                        </Row>
                        <FormGroup controlId={`problem${count}`}>
                            <FormLabel>Problem Path:</FormLabel>
                            {/* This might be a nice UI addition, but might be annoying if we don't autoremove a duplicate. */}
                            <InputGroup>
                                <FormControl
                                    required
                                    value={problem.webworkQuestionPath}
                                    onChange={onFormChangeProblemIndex('webworkQuestionPath')}
                                    onBlur={onFormBlurProblemIndex('webworkQuestionPath')}
                                />
                            </InputGroup>
                        </FormGroup>
                        <Row>
                            <FormGroup as={Col} controlId={`weight${count}`}>
                                <FormLabel>Problem Weight:</FormLabel>
                                {/* Should this be a range? */}
                                <FormControl
                                    value={problem.weight}
                                    type='number'
                                    min={0}
                                    onChange={onFormChangeProblemIndex('weight')}
                                    onBlur={onFormBlurProblemIndex('weight')}
                                />
                            </FormGroup>
                            <FormGroup as={Col} controlId={`attempts${count}`}>
                                <FormLabel>Maximum Attempts:</FormLabel>
                                {/* Should this be a range? */}
                                <FormControl
                                    value={problem.maxAttempts}
                                    type='number'
                                    min={-1}
                                    onChange={onFormChangeProblemIndex('maxAttempts')}
                                    onBlur={onFormBlurProblemIndex('maxAttempts')}
                                />
                            </FormGroup>
                            <FormGroup as={Col} controlId={`optional${count}`}>
                                <FormCheck
                                    label='Optional?'
                                    checked={problem.optional}
                                    type='checkbox'
                                    onChange={onFormChangeProblemIndex('optional')}
                                    onBlur={onFormBlurProblemIndex('optional')}
                                />
                            </FormGroup>
                        </Row>
                    </div>
                )}
            </Draggable>
        );
    };

    const onTopicMetadataChange = (e: any, name: keyof NewCourseTopicObj) => {
        let val = e.target.value;
        console.log(`updating ${name} to ${val}`);
        switch (name) {
        case 'startDate':
        case 'endDate':
        case 'deadDate':
            val = moment(val);
            break;
        }

        const updates = {
            [name]: val
        };

        // TODO remove this once we have dead date ui
        if (name === 'endDate') {
            updates.deadDate = val;
        }

        setTopicMetadata({ ...topicMetadata, ...updates });

        console.log(topicMetadata);
    };

    const onTopicMetadataBlur = async (e: any, name: keyof NewCourseTopicObj) => {
        let val = e.target.value;
        console.log(`updating ${name} to ${val}`);
        switch (name) {
        case 'startDate':
        case 'endDate':
        case 'deadDate':
            val = moment(val);
            break;
        }

        const updates = {
            [name]: val
        };
        // TODO remove this once we have dead date ui
        if (name === 'endDate') {
            updates.deadDate = val;
        }
        await AxiosRequest.put(`/courses/topic/${existingTopic?.id}`, updates);

        setTopicMetadata({ ...topicMetadata, ...updates });

        console.log(topicMetadata);
    };

    const onDrop = useCallback(acceptedFiles => {
        // TODO: Here, we should upload the DEF file to the server, and then move to the next page.
        console.log(acceptedFiles);
        (async () => {
            const data = new FormData();
            data.append('def-file', acceptedFiles[0]);
            const res = await AxiosRequest.post(`/courses/def?courseTopicId=${existingTopic?.id}`, data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setProblems([
                ...problems,
                ...res.data.data.newQuestions.map((question: ProblemObject) => new ProblemObject(question))
            ]);
        })();
    }, []);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleSubmit = (e: any) => {
        e.preventDefault();
        const problemsWithOrdering = problems.map((problem, index) => {
            // Problems should always render in the order that the professor sets them.
            problem.problemNumber = index + 1; // problemNumber should be 1..n not 0..(n-1)

            // If the base path is present, this is already a full path and should escape further processing.
            if (_.startsWith(problem.webworkQuestionPath, webworkBasePath)) {
                return problem;
            }

            problem.webworkQuestionPath = problem.webworkQuestionPath.replace(/^Library/, 'OpenProblemLibrary');
            // If we don't recognize the prefix, assume they're using Contrib.
            if (_.startsWith(problem.webworkQuestionPath, 'Contrib') || _.startsWith(problem.webworkQuestionPath, 'OpenProblemLibrary')) {
                problem.webworkQuestionPath = `${webworkBasePath}${problem.webworkQuestionPath}`;
            } else {
                problem.webworkQuestionPath = `${webworkBasePath}Contrib/${problem.webworkQuestionPath}`;
            }

            return problem;
        });
        console.log(problemsWithOrdering);
        console.log(topicMetadata);
        addTopic(unitIndex, existingTopic, new NewCourseTopicObj({ ...topicMetadata, questions: problemsWithOrdering }));
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) {
            return;
        }

        if (result.destination.index === result.source.index) {
            return;
        }

        const reorder = (list: Array<any>, startIndex: number, endIndex: number) => {
            const result = Array.from(list);
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);

            return result;
        };
        let newProbs = reorder(problems, result.source.index, result.destination.index);
        newProbs = newProbs.map((prob, i) => {
            prob.problemNumber = i;
            return prob;
        });
        console.log(newProbs);
        setProblems(newProbs);
    };

    const addNewQuestion = async () => {
        const result = await AxiosRequest.post('/courses/question', {
            courseTopicContentId: existingTopic?.id
        });
        setProblems([
            ...problems,
            new ProblemObject(result.data.data)
        ]);
    };

    const addNewQuestionClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.stopPropagation();
        addNewQuestion();
    };

    return (
        <Form
            onSubmit={handleSubmit}
            {...getRootProps()}
            onClick={() => { }}
            style={isDragActive ? { backgroundColor: 'red' } : {}}>
            <Modal.Header closeButton>
                <h3>{existingTopic ? `Editing: ${existingTopic.name}` : 'Add a Topic'}</h3>
            </Modal.Header>
            <Modal.Body style={{ minHeight: `${24 + (problems.length * 19)}vh` }}>
                <input type="file" {...getInputProps()} />
                <h6>Add questions to your topic, or import a question list by dragging in a DEF file.</h6>
                <FormGroup as={Row} controlId='topicTitle' onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); }}>
                    <Form.Label column sm="2">Topic Title:</Form.Label>
                    <Col sm="10">
                        <FormControl
                            required
                            onChange={(e: any) => onTopicMetadataChange(e, 'name')}
                            onBlur={(e: any) => onTopicMetadataBlur(e, 'name')}
                            defaultValue={topicMetadata?.name}
                        />
                    </Col>
                </FormGroup>
                <Row>
                    <MuiPickersUtilsProvider utils={MomentUtils}>
                        <Col>
                            <DateTimePicker
                                variant='inline'
                                label='Start date'
                                name={'start'}
                                value={topicMetadata.startDate}
                                onChange={() => { }}
                                onAccept={(date: MaterialUiPickersDate) => {
                                    if (!date) return;
                                    const e = { target: { value: date.toDate() } };
                                    onTopicMetadataChange(e, 'startDate');
                                    onTopicMetadataBlur(e, 'startDate');
                                }}
                                fullWidth={true}
                                InputLabelProps={{ shrink: false }}
                                inputProps={{ style: { textAlign: 'center' } }}
                                defaultValue={moment(topicMetadata?.startDate).format('YYYY-MM-DD')}
                            />
                        </Col>
                        <Col>
                            <DateTimePicker
                                variant='inline'
                                label='End date'
                                name={'end'}
                                value={topicMetadata.endDate}
                                onChange={() => { }}
                                onAccept={(date: MaterialUiPickersDate) => {
                                    if (!date) return;
                                    const e = { target: { value: date.toDate() } };
                                    onTopicMetadataChange(e, 'endDate');
                                    onTopicMetadataBlur(e, 'endDate');
                                }}
                                fullWidth={true}
                                InputLabelProps={{ shrink: false }}
                                inputProps={{ style: { textAlign: 'center' } }}
                                defaultValue={moment(topicMetadata?.endDate).format('YYYY-MM-DD')}
                            />
                        </Col>
                    </MuiPickersUtilsProvider>
                </Row>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId='problemsList'>
                        {
                            (provided) => (
                                <div ref={provided.innerRef} style={{ backgroundColor: 'white' }} {...provided.droppableProps}>
                                    {problems.map(addProblemRows)}
                                    {provided.placeholder}
                                </div>
                            )
                        }
                    </Droppable>
                </DragDropContext>
            </Modal.Body>
            <Modal.Footer>
                {/* Do we need a cancel button in the Modal? You can click out and click the X. */}
                {/* <Button variant="danger" className="float-left">Cancel</Button> */}
                <Button variant="secondary" onClick={getRootProps().onClick}>Upload a DEF file</Button>
                <Button variant="secondary" onClick={addNewQuestionClick}>Add Another Question</Button>
                <Button
                    variant="primary"
                    type='submit'
                    disabled={problems.length <= 0}
                >Finish</Button>
            </Modal.Footer>
        </Form>
    );
};

export default TopicCreationModal;
