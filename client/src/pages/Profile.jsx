import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { Box, Heading, Spinner, Button, Flex } from '@chakra-ui/react';

import RideList from '../components/RideList';
import Layout from '../components/Layout';

import { QUERY_USER, QUERY_ME, QUERY_RIDES } from '../utils/queries';
import { REMOVE_RIDE } from '../utils/mutations';

import Auth from '../utils/auth';

const Profile = () => {
  // Extract the username from URL parameters
  const { username: userParam } = useParams();
  const [currentFilter, setCurrentFilter] = useState('yourRides');

  // Fetch user data based on whether a username is provided
  const { loading, data } = useQuery(userParam ? QUERY_USER : QUERY_ME, {
    variables: { username: userParam },
  });
  const { data: rideData, loading: rideLoading } = useQuery(QUERY_RIDES);

  // Set up mutation for removing a ride
  const [removeRide] = useMutation(REMOVE_RIDE, {
    refetchQueries: [
      { query: QUERY_RIDES },
      {
        query: userParam ? QUERY_USER : QUERY_ME,
        variables: { username: userParam },
      },
    ],
  });

  const user = data?.me || data?.user || {};
  const currentUser = Auth.loggedIn() ? Auth.getProfile().data.username : null;

  // Show spinner while data is loading
  if (loading || rideLoading) {
    return <Spinner />;
  }

  // Handle removing a ride
  const handleRemoveRide = async (rideId) => {
    try {
      await removeRide({ variables: { rideId } });
    } catch (err) {
      console.error(err);
    }
  };

  // Filter rides created by the user
  const userRides =
    rideData?.rides?.filter((ride) => ride.rideAuthor === user.username) || [];
  // Filter rides commented on by the user
  const commentedRides =
    rideData?.rides?.filter((ride) =>
      ride.comments.some((comment) => comment.commentAuthor === currentUser)
    ) || [];

  return (
    <Layout>
      <Box
        textAlign='center'
        mb={5}
        border='1px solid #CBD5E0'
        borderRadius='full'
      >
        <Heading as='h2' size='lg' color='black' p={3}>
          Viewing {userParam ? `${user.username}'s` : 'your'} profile.
        </Heading>
      </Box>

      <Flex mt={6} mb={4}>
        <Button
          borderRadius='full'
          onClick={() => setCurrentFilter('yourRides')}
          colorScheme={currentFilter === 'yourRides' ? 'blue' : 'blackAlpha'}
        >
          Your Rides
        </Button>
        <Button
          borderRadius='full'
          onClick={() => setCurrentFilter('commentedRides')}
          colorScheme={
            currentFilter === 'commentedRides' ? 'blue' : 'blackAlpha'
          }
          ml={2}
        >
          Your comments
        </Button>
      </Flex>

      <Box mb={5}>
        {/* Render rides created by the user */}
        {currentFilter === 'yourRides' && (
          <>
            {userRides.length > 0 ? (
              <>
                <Heading as='h3' size='md' color='black' mb='4'>
                  Ride(s) you've created ...
                </Heading>
                <RideList
                  rides={userRides}
                  showUsername={true}
                  handleRemoveRide={handleRemoveRide}
                />
              </>
            ) : (
              <Heading as='h3' size='md' color='black'>
                You haven't created any rides.
              </Heading>
            )}
          </>
        )}
        {/* Render rides commented on by the user */}
        {currentFilter === 'commentedRides' && (
          <>
            {commentedRides.length > 0 ? (
              <>
                <Heading as='h3' size='md' color='black' mb='4'>
                  Ride(s) you've commented on ...
                </Heading>
                <RideList rides={commentedRides} showUsername={true} />
              </>
            ) : (
              <Heading as='h3' size='md' color='black'>
                You haven't made any comments.
              </Heading>
            )}
          </>
        )}
      </Box>
    </Layout>
  );
};

export default Profile;
