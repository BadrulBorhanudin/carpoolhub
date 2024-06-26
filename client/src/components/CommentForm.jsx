import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
  Button,
  FormControl,
  Textarea,
  Text,
  useToast,
  useDisclosure,
  Flex,
} from '@chakra-ui/react';

import { ADD_COMMENT } from '../utils/mutations';
import Auth from '../utils/auth';
import Login from '../pages/Login';
import Signup from '../pages/Signup';

const CommentForm = ({ rideId }) => {
  // Chakra UI hook for managing login modal state
  const {
    isOpen: isLoginOpen,
    onOpen: onLoginOpen,
    onClose: onLoginClose,
  } = useDisclosure();

  // Chakra UI hook for managing signup modal state
  const {
    isOpen: isSignupOpen,
    onOpen: onSignupOpen,
    onClose: onSignupClose,
  } = useDisclosure();

  // State hooks for comment text and character count
  const [commentText, setCommentText] = useState('');
  const [characterCount, setCharacterCount] = useState(0);

  // Apollo Client hook for adding a comment
  const [addComment, { error }] = useMutation(ADD_COMMENT);

  // Chakra UI hook for displaying toast notifications
  const toast = useToast();

  // Handle form submission
  const handleFormSubmit = async (event) => {
    event.preventDefault();

    try {
      await addComment({
        variables: {
          rideId,
          commentText,
          commentAuthor: Auth.getProfile().data.username,
        },
      });

      // Reset comment text and show success toast
      setCommentText('');
      toast({
        title: 'Comment added.',
        description: 'Your comment has been added successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error adding comment.',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle text area change
  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'commentText' && value.length <= 280) {
      setCommentText(value);
      setCharacterCount(value.length);
    }
  };

  return (
    <Box p={4} borderWidth='1px' borderColor='gray.300' borderRadius='3xl'>
      {Auth.loggedIn() ? (
        <>
          <form onSubmit={handleFormSubmit}>
            <FormControl mb={2}>
              <Textarea
                id='commentText'
                name='commentText'
                placeholder='Add your request...'
                value={commentText}
                onChange={handleChange}
                resize='vertical'
              />
            </FormControl>
            <Text
              ml='1'
              mb={2}
              fontSize='sm'
              color={characterCount === 280 || error ? 'red.500' : 'black'}
            >
              Character Count: {characterCount}/280
              {error && (
                <Text ml={2} color='red.500'>
                  {error.message}
                </Text>
              )}
            </Text>
            <Flex justifyContent='flex-end'>
              <Button mb={3} colorScheme='blue' rounded='full' type='submit'>
                Let's Plan
              </Button>
            </Flex>
          </form>
        </>
      ) : (
        <Text fontSize='sm'>
          You need to be logged in to request the ride. Please{' '}
          <Button
            fontSize='sm'
            variant='link'
            colorScheme='blue'
            onClick={onLoginOpen}
          >
            login
          </Button>{' '}
          or{' '}
          <Button
            fontSize='sm'
            variant='link'
            colorScheme='blue'
            onClick={onSignupOpen}
          >
            signup
          </Button>
          .
        </Text>
      )}
      {/* Login and Signup modals */}
      <Login isOpen={isLoginOpen} onClose={onLoginClose} />
      <Signup isOpen={isSignupOpen} onClose={onSignupClose} />
    </Box>
  );
};

export default CommentForm;
