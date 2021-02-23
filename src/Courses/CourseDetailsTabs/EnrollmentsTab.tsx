import React, { useRef } from 'react';
import EmailComponentWrapper from './EmailComponentWrapper';
import { Row, FormLabel, InputGroup, FormControl, Button, Col } from 'react-bootstrap';
import { UserRole, getUserRole } from '../../Enums/UserRole';
import { useCourseContext } from '../CourseProvider';
import logger from '../../Utilities/Logger';
import { Snackbar } from '@material-ui/core';
import { Alert as MUIAlert } from '@material-ui/lab';
import { useMUIAlertState } from '../../Hooks/useAlertState';

interface EnrollmentsTabProps {
}

export const EnrollmentsTab: React.FC<EnrollmentsTabProps> = () => {
    const {course, users} = useCourseContext();
    const [{ message, severity }, setUpdateAlert] = useMUIAlertState();
    const courseCode = course.code;
    // I don't understand why I need two encodeURIComponent here
    // I want one to be in the enroll user page (since the params decodes it anyway, but it needs to be encoded so it can be decoded by express)
    // The only thing I can think of is that useParams is decoding as a uri and not a uri component, however using just uri breaks it (and I can see it's not encoded correctly)
    const enrollUrl = `${window.location.host}/common/courses/enroll/${encodeURIComponent(encodeURIComponent(courseCode))}`;
    const userType: UserRole = getUserRole();

    const textAreaRef = useRef<HTMLInputElement>(null);

    const copyToClipboard = (e: any) => {
        if (textAreaRef?.current === null) {
            logger.error('enrollLinkRef not logged properly.');
            return;
        }
        logger.info(textAreaRef);
        textAreaRef?.current.select();

        try {
            const res = document.execCommand('copy');
            logger.info(`Copy operation ${res ? 'was successful' : 'failed'}`);
            setUpdateAlert({message: 'Enrollment link copied to your clipboard!', severity: 'success'});
        } catch (err) {
            setUpdateAlert({
                message: 'Your browser does not support the copy button. Please highlight the enrollment link and press CTRL+C or CMD+C keys to copy the link.', 
                severity: 'error'
            });
            // We should check the user agent to see what browser failed this.
            logger.error('Copy to clipboard failed', err);
        } finally {
            e.target.focus();
        }
    };

    return (
        <>
            <div
                style={{
                    padding:'20px',
                    paddingLeft:'0px',
                }}
            >
                <h2>Current Enrollments</h2>
            </div>
            {userType !== UserRole.STUDENT && (
                <>
                    <FormLabel>Enrollment Link:</FormLabel>
                    <InputGroup className="mb-3">
                        <FormControl
                            readOnly
                            aria-label="Enrollment link"
                            aria-describedby="basic-addon2"
                            ref={textAreaRef}
                            value={`${window.location.protocol}//${enrollUrl}`}
                        />
                        <InputGroup.Append>
                            <Button variant="outline-secondary" onClick={copyToClipboard}>Copy to Clipboard</Button>
                        </InputGroup.Append>
                    </InputGroup>
                </>
            )}
            <Snackbar
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                open={message !== ''}
                autoHideDuration={6000}
                onClose={() => setUpdateAlert({message: '', severity: 'error'})}
                style={{ maxWidth: '50vw' }}
            >
                <MUIAlert severity={severity}>
                    {message}
                </MUIAlert>
            </Snackbar>
            <EmailComponentWrapper users={users} />
        </>
    );
};

export default EnrollmentsTab;